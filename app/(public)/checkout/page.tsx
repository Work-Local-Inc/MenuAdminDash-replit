"use client"

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCartStore, useHasCartHydrated, AppliedPromo } from '@/lib/stores/cart-store'
import { createClient } from '@/lib/supabase/client'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckoutAddressForm } from '@/components/customer/checkout-address-form'
import { CheckoutPaymentForm } from '@/components/customer/checkout-payment-form'
import { CheckoutPaymentSelection } from '@/components/customer/checkout-payment-selection'
import { CheckoutSignInModal } from '@/components/customer/checkout-signin-modal'
import { ResetPasswordModal } from '@/components/customer/reset-password-modal'
import { OrderTypeSelector } from '@/components/customer/order-type-selector'
import { Schedule } from '@/components/customer/schedule-time-picker'
import { PromoCodeInput } from '@/components/customer/promo-code-input'
import { useToast } from '@/hooks/use-toast'
import { ShoppingCart, MapPin, CreditCard, ArrowLeft, LogIn, LogOut, User, ShoppingBag, Store, Wallet, Info, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { trackBeginCheckout, trackAddPaymentInfo, trackPurchase } from '@/lib/analytics'
import { AnalyticsProvider } from '@/components/providers/analytics-provider'
import { getTaxLabel } from '@/lib/types/tax'
import { getApiBaseUrl } from '@/lib/api-utils'

// Cache loaded Stripe instances by publishable key to avoid multiple loads
const stripeCache = new Map<string, Promise<Stripe | null>>()

interface DeliveryAddress {
  id?: number
  address_label?: string
  street_address: string
  unit?: string
  city_id?: number // Optional for guest checkout
  city_name?: string
  city?: string // City string from Google Places (for guests)
  province?: string // Province string from Google Places (for guests)
  postal_code: string
  delivery_instructions?: string
  email?: string // For guest checkouts
  name?: string // Customer name for order
  phone?: string // Customer phone number
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isResettingPasswordFromParams = searchParams.get('reset_password') === 'true'
  const isResettingPasswordRef = useRef(
    isResettingPasswordFromParams || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('reset_password') === 'true')
  )
  if (isResettingPasswordFromParams) {
    isResettingPasswordRef.current = true
  }
  const isResettingPassword = isResettingPasswordRef.current
  const { toast } = useToast()
  const [supabase] = useState(() => createClient())
  
  const { 
    items, 
    restaurantName, 
    restaurantSlug, 
    restaurantAddress,
    restaurantPrimaryColor,
    gaMeasurementId,
    getSubtotal, 
    getDiscount,
    getEffectiveDeliveryFee, 
    getTax,
    getTaxBreakdown,
    getTotal, 
    minOrder,
    orderType,
    orderTypeSelected,
    pickupTime,
    clearCart,
    appliedPromo,
    applyPromo
  } = useCartStore()
  
  const cartHydrated = useHasCartHydrated()
  
  // Debug: Log what slug the cart has stored
  useEffect(() => {
    console.log('[Checkout] Cart restaurant info:', {
      restaurantSlug,
      restaurantName,
      restaurantId: useCartStore.getState().restaurantId,
    })
  }, [restaurantSlug, restaurantName])
  
  // Create button style with restaurant's primary color
  const brandedButtonStyle = restaurantPrimaryColor 
    ? { backgroundColor: restaurantPrimaryColor, borderColor: restaurantPrimaryColor }
    : undefined
  
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'address' | 'payment-method' | 'payment'>('address')
  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddress | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [clientSecret, setClientSecret] = useState<string>('')
  const [showSignInModal, setShowSignInModal] = useState(false)
  const [guestPickupEmail, setGuestPickupEmail] = useState('')
  const [guestPickupName, setGuestPickupName] = useState('')
  const [guestPickupPhone, setGuestPickupPhone] = useState('')
  const [loggedInPickupPhone, setLoggedInPickupPhone] = useState('') // For logged-in users missing phone
  const [loggedInPickupName, setLoggedInPickupName] = useState('') // For phone-only users missing name
  const [loggedInPickupEmail, setLoggedInPickupEmail] = useState('') // For phone-only users missing email
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [isDeliveryBlocked, setIsDeliveryBlocked] = useState(false)
  const [isSubmittingCashOrder, setIsSubmittingCashOrder] = useState(false)
  const [orderPlacedSuccessfully, setOrderPlacedSuccessfully] = useState(false) // Prevent empty cart redirect after order
  const [serviceConfig, setServiceConfig] = useState<{ 
    has_delivery_enabled?: boolean; 
    pickup_enabled?: boolean;
  } | null>(null)
  const [serviceConfigLoading, setServiceConfigLoading] = useState(true) // Start as loading to prevent flash
  const [orderNotes, setOrderNotes] = useState('')
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [stripeLoading, setStripeLoading] = useState(true)
  
  // Ref to prevent double payment intent creation (React Strict Mode causes double renders)
  const paymentIntentCreatingRef = useRef(false)

  // Derived checkout mode - determines if we're in pickup-only, delivery-only, or both mode
  const isPickupOnly = serviceConfig && !serviceConfig.has_delivery_enabled && serviceConfig.pickup_enabled
  const isDeliveryOnly = serviceConfig && serviceConfig.has_delivery_enabled && !serviceConfig.pickup_enabled
  const effectiveOrderType = isPickupOnly ? 'pickup' : (isDeliveryOnly ? 'delivery' : orderType)

  // Set dynamic page title
  useEffect(() => {
    document.title = restaurantName 
      ? `Checkout - ${restaurantName} | Menu.ca` 
      : 'Checkout | Menu.ca'
  }, [restaurantName])

  // Debug: Log currentUser changes
  useEffect(() => {
    console.log('[Checkout] ⭐ currentUser state changed:', currentUser ? { id: currentUser.id, email: currentUser.email, first_name: currentUser.first_name } : 'null')
  }, [currentUser])

  // Debug: Log loading state changes
  useEffect(() => {
    console.log('[Checkout] ⭐ loading state changed:', loading)
  }, [loading])
  
  // Fetch payment config and load Stripe dynamically based on restaurant's payment mode
  useEffect(() => {
    const loadStripeForRestaurant = async () => {
      if (!restaurantSlug) {
        console.log('[Checkout] No restaurant slug, skipping Stripe load')
        return
      }
      
      setStripeLoading(true)
      
      try {
        console.log('[Checkout] Fetching payment config for:', restaurantSlug)
        const response = await fetch(`${getApiBaseUrl()}/api/customer/restaurants/${restaurantSlug}/payment-config`)
        
        if (!response.ok) {
          console.error('[Checkout] Failed to fetch payment config')
          setStripeLoading(false)
          return
        }
        
        const { publishableKey, paymentMode } = await response.json()
        console.log('[Checkout] Payment config received - mode:', paymentMode, 'key prefix:', publishableKey?.substring(0, 10))
        
        if (!publishableKey) {
          console.error('[Checkout] No publishable key returned from payment config')
          setStripeLoading(false)
          return
        }
        
        // Use cached Stripe instance or load new one
        let promise = stripeCache.get(publishableKey)
        if (!promise) {
          console.log('[Checkout] Loading Stripe with key:', publishableKey.substring(0, 10) + '...')
          promise = loadStripe(publishableKey)
          stripeCache.set(publishableKey, promise)
        } else {
          console.log('[Checkout] Using cached Stripe instance')
        }
        
        setStripePromise(promise)
        setStripeLoading(false)
      } catch (error) {
        console.error('[Checkout] Error loading Stripe:', error)
        setStripeLoading(false)
      }
    }
    
    loadStripeForRestaurant()
  }, [restaurantSlug])
  
  // Combined data fetching - run all API calls in parallel for speed
  useEffect(() => {
    const fetchAllData = async () => {
      console.log('[Checkout] Starting parallel data fetch...')
      const startTime = Date.now()
      
      // Set loading states BEFORE fetching
      if (restaurantSlug) {
        setSchedulesLoading(true)
        setServiceConfigLoading(true)
      }
      
      // Build list of fetch promises - always fetch profile
      const profilePromise = fetch(`${getApiBaseUrl()}/api/customer/profile`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : { user: null })
        .catch(() => ({ user: null }))
      
      // Fetch restaurant data only if we have a slug
      let schedulesPromise: Promise<any> = Promise.resolve({ schedules: [] })
      let restaurantPromise: Promise<any> = Promise.resolve(null)
      
      if (restaurantSlug) {
        schedulesPromise = fetch(`${getApiBaseUrl()}/api/customer/restaurants/${restaurantSlug}/schedules`)
          .then(res => res.ok ? res.json() : { schedules: [] })
          .catch(() => ({ schedules: [] }))
        
        restaurantPromise = fetch(`${getApiBaseUrl()}/api/customer/restaurants/${restaurantSlug}`)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      }
      
      try {
        // Run ALL fetches in parallel
        const [profileData, schedulesData, restaurantData] = await Promise.all([
          profilePromise,
          schedulesPromise,
          restaurantPromise
        ])
        
        console.log('[Checkout] All data fetched in', Date.now() - startTime, 'ms')
        
        // Process profile
        if (profileData?.user) {
          console.log('[Checkout] User profile loaded:', profileData.user.id, profileData.user.email)
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (!profileData.user.phone && authUser?.phone) {
            profileData.user.phone = authUser.phone
          }
          setCurrentUser(profileData.user)
        } else {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (authUser) {
            console.log('[Checkout] No profile but authenticated - using auth data (phone-only user)')
            setCurrentUser({
              id: null,
              auth_user_id: authUser.id,
              email: authUser.email || '',
              first_name: authUser.user_metadata?.first_name || '',
              last_name: authUser.user_metadata?.last_name || '',
              phone: authUser.phone || '',
            })
          } else {
            console.log('[Checkout] No user profile - Guest checkout mode')
            setCurrentUser(null)
          }
        }
        
        // Process schedules (only if we fetched them)
        if (restaurantSlug && schedulesData?.schedules) {
          console.log('[Checkout] Schedules loaded:', schedulesData.schedules.length)
          setSchedules(schedulesData.schedules)
        }
        
        // Process restaurant config (only if we fetched it)
        if (restaurantSlug && restaurantData) {
          const config = restaurantData.delivery_and_pickup_configs?.[0] || restaurantData.delivery_and_pickup_configs
          if (config) {
            console.log('[Checkout] ✅ Service config loaded:', { 
              has_delivery_enabled: config.has_delivery_enabled, 
              pickup_enabled: config.pickup_enabled
            })
            setServiceConfig({
              has_delivery_enabled: config.has_delivery_enabled,
              pickup_enabled: config.pickup_enabled
            })
          } else {
            console.log('[Checkout] ⚠️ No service config found - delivery/pickup will default to enabled')
          }

          const cartAddress = useCartStore.getState().restaurantAddress;
          if (!cartAddress && restaurantData) {
            const loc = restaurantData.restaurant_locations?.find((l: any) => l.is_primary) 
              || restaurantData.restaurant_locations?.[0];
            let fallbackAddress = '';
            if (loc?.street_address) {
              fallbackAddress = `${loc.street_address}${loc.postal_code ? `, ${loc.postal_code}` : ''}`;
            } else if (restaurantData.street_address) {
              fallbackAddress = restaurantData.street_address;
              if (restaurantData.city) fallbackAddress += `, ${restaurantData.city}`;
              if (restaurantData.postal_code) fallbackAddress += ` ${restaurantData.postal_code}`;
            }
            if (fallbackAddress) {
              useCartStore.getState().setRestaurantAddress(fallbackAddress);
              console.log('[Checkout] Set restaurant address from API:', fallbackAddress);
            }
          }
        }
      } catch (error) {
        console.error('[Checkout] Error fetching data:', error)
        setCurrentUser(null)
      } finally {
        setLoading(false)
        setSchedulesLoading(false)
        setServiceConfigLoading(false)
      }
    }
    
    fetchAllData()
    
    // Listen for auth state changes (separate from initial load)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Checkout] Auth state changed:', event, session?.user?.id)
      
      if (event === 'SIGNED_IN' && session?.user) {
        const authUser = session.user
        const fetchProfile = async (retries = 3): Promise<void> => {
          try {
            const response = await fetch(`${getApiBaseUrl()}/api/customer/profile`, { credentials: 'include' })
            if (response.ok) {
              const { user: userData } = await response.json()
              if (userData) {
                if (!userData.phone && authUser.phone) {
                  userData.phone = authUser.phone
                }
                setCurrentUser(userData)
              } else if (retries > 0) {
                await new Promise(r => setTimeout(r, 1000))
                return fetchProfile(retries - 1)
              } else {
                setCurrentUser({
                  id: null,
                  auth_user_id: authUser.id,
                  email: authUser.email || '',
                  first_name: authUser.user_metadata?.first_name || '',
                  last_name: authUser.user_metadata?.last_name || '',
                  phone: authUser.phone || '',
                })
              }
            }
          } catch (error) {
            console.error('[Checkout] Auth refresh error:', error)
          }
        }
        await fetchProfile()
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [restaurantSlug])

  useEffect(() => {
    if (!loading && cartHydrated && items.length === 0 && !orderPlacedSuccessfully && !isResettingPassword) {
      const restSlug = restaurantSlug || searchParams.get('restaurant')
      toast({
        title: "Cart is empty",
        description: "Add items to your cart before checking out",
        variant: "destructive",
      })
      router.push(restSlug ? `/r/${restSlug}` : '/customer/login')
    }
  }, [items, loading, cartHydrated, restaurantSlug, router, toast, orderPlacedSuccessfully, isResettingPassword, searchParams])

  // Hydrate gaMeasurementId if missing (handles direct checkout entry from saved cart)
  const { setGaMeasurementId } = useCartStore()
  useEffect(() => {
    if (!gaMeasurementId && restaurantSlug) {
      fetch(`${getApiBaseUrl()}/api/customer/restaurants/${restaurantSlug}/analytics`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.ga_measurement_id) {
            setGaMeasurementId(data.ga_measurement_id)
          }
        })
        .catch(() => {})
    }
  }, [gaMeasurementId, restaurantSlug, setGaMeasurementId])

  const subtotal = getSubtotal()
  const discount = getDiscount()
  const effectiveDeliveryFee = getEffectiveDeliveryFee()
  const tax = getTax()
  const total = getTotal()

  // Track begin_checkout event when checkout page loads with items and GA is ready
  const hasTrackedBeginCheckout = useRef(false)
  useEffect(() => {
    if (!loading && items.length > 0 && gaMeasurementId && !hasTrackedBeginCheckout.current && total > 0) {
      hasTrackedBeginCheckout.current = true
      const cartItems = items.map(item => ({
        id: item.dishId,
        name: item.dishName,
        price: item.sizePrice,
        quantity: item.quantity
      }))
      trackBeginCheckout(cartItems, total)
    }
  }, [loading, items, gaMeasurementId, total])

  // Auto-apply deals: Fetch and automatically apply eligible deals
  const hasCheckedAutoDeals = useRef(false)
  // Function to check and apply auto-deals - can be called on load or when guest enters email
  const checkAutoDeals = async (email: string | null | undefined, forceCheck = false) => {
    // Skip if we already have a promo applied or no restaurant
    if ((!forceCheck && hasCheckedAutoDeals.current) || !restaurantSlug || subtotal <= 0 || appliedPromo) {
      return
    }
    
    if (!forceCheck) {
      hasCheckedAutoDeals.current = true
    }
    
    console.log('[Checkout] Checking for auto-apply deals... Email:', email)
    
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/customer/restaurants/${restaurantSlug}/auto-deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtotal,
          service_type: effectiveOrderType,
          customer_email: email || null,
          customer_id: currentUser?.id || null
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.eligible_deal && data.applied) {
          console.log('[Checkout] Auto-applying deal:', data.eligible_deal)
          
          // Determine if this is a percentage or fixed discount
          // Handle variations: percent, percent_off, percentTotal, amount, amount_off, value, valueTotal
          const dealType = data.eligible_deal.deal_type || ''
          const isPercentage = dealType.includes('percent') || dealType === 'percentTotal'
          
          // Apply the deal to cart
          // AppliedPromo uses 'percent' for percentage discounts and 'currency' for fixed amounts
          const promo: AppliedPromo = {
            code: data.eligible_deal.name || 'AUTO-DEAL',
            type: isPercentage ? 'percent' : 'currency',
            value: isPercentage
              ? data.eligible_deal.discount_percent
              : (data.eligible_deal.discount_amount || data.eligible_deal.calculated_discount),
            description: data.eligible_deal.is_first_order_only 
              ? `${data.eligible_deal.name} (First Order)` 
              : data.eligible_deal.name,
            promoId: data.eligible_deal.id,
            promoType: 'deal',
          }
          
          applyPromo(promo)
          
          toast({
            title: "Deal Applied!",
            description: promo.description,
          })
        }
      }
    } catch (error) {
      console.error('[Checkout] Error fetching auto-deals:', error)
    }
  }
  
  useEffect(() => {
    // Only run after initial loading is complete
    // Also run when guestPickupEmail changes (in case email entered before subtotal becomes >0)
    if (!loading && restaurantSlug && subtotal > 0) {
      const email = currentUser?.email || guestPickupEmail || selectedAddress?.email
      checkAutoDeals(email)
    }
  }, [loading, restaurantSlug, subtotal, effectiveOrderType, currentUser, guestPickupEmail, selectedAddress, appliedPromo])
  
  // Handler for when guest enters email - re-check for first-order deals
  const handleGuestEmailBlur = () => {
    if (guestPickupEmail && guestPickupEmail.includes('@') && !appliedPromo) {
      console.log('[Checkout] Guest email entered, re-checking auto-deals...')
      checkAutoDeals(guestPickupEmail, true)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast({
        title: "Signed out",
        description: "You've been signed out successfully",
      })
      setCurrentUser(null)
    } catch (error: any) {
      console.error('Sign out error:', error)
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      })
    }
  }

  const handleSignInSuccess = async () => {
    // Auth state listener handles the update automatically - no reload needed!
    console.log('[Checkout] Sign-in success - closing modal')
    setShowSignInModal(false)
    
    // IMPORTANT: Clear payment intent if one exists - user context changed!
    // The new user_id needs to be in the payment intent metadata
    if (clientSecret || step === 'payment-method') {
      console.log('[Checkout] Clearing existing payment intent - user signed in')
      setClientSecret('')
      setSelectedPaymentMethod('')
      paymentIntentCreatingRef.current = false // Reset so new payment intent can be created
      setStep('address') // Go back to address to recreate payment intent with new user
    }
    
    toast({
      title: "Welcome back!",
      description: clientSecret ? "Please confirm your address again." : "Loading your saved addresses...",
    })
  }

  const handleAddressConfirmed = async (address: DeliveryAddress) => {
    // Check minimum order for delivery before proceeding
    if (subtotal < minOrder) {
      toast({
        title: "Minimum order not met",
        description: `Add $${(minOrder - subtotal).toFixed(2)} more for delivery, or switch to pickup`,
        variant: "destructive",
      })
      return
    }
    
    setSelectedAddress(address)
    // Sync delivery_instructions from address form to orderNotes for API
    if (address.delivery_instructions) {
      setOrderNotes(address.delivery_instructions)
    }
    // Move to payment method selection - don't create payment intent yet
    console.log('[Checkout] Address confirmed, moving to payment method selection')
    setStep('payment-method')
  }
  
  // Handler for pickup flow - go to payment method selection
  const handlePickupConfirmed = async () => {
    // For guests, validate name, phone, and email
    if (!currentUser) {
      if (!guestPickupName || guestPickupName.trim().length < 2) {
        toast({
          title: "Name required",
          description: "Please enter your name for the order",
          variant: "destructive",
        })
        return
      }
      if (!guestPickupPhone || guestPickupPhone.trim().length < 7) {
        toast({
          title: "Phone required",
          description: "Please enter a valid phone number",
          variant: "destructive",
        })
        return
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!guestPickupEmail || !emailRegex.test(guestPickupEmail)) {
        toast({
          title: "Email required",
          description: "Please enter a valid email address (e.g., name@example.com)",
          variant: "destructive",
        })
        return
      }
    } else {
      const userPhone = loggedInPickupPhone.trim() || currentUser.phone || ''
      if (!userPhone || userPhone.length < 7) {
        toast({
          title: "Phone required",
          description: "Please enter your phone number so the restaurant can contact you",
          variant: "destructive",
        })
        return
      }
      const userEmail = currentUser.email || loggedInPickupEmail.trim()
      if (!userEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!loggedInPickupEmail.trim() || !emailRegex.test(loggedInPickupEmail.trim())) {
          toast({
            title: "Email required",
            description: "Please enter a valid email address for your order confirmation",
            variant: "destructive",
          })
          return
        }
      }
      const userName = loggedInPickupName.trim() || `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim()
      if (!userName || userName.length < 2) {
        toast({
          title: "Name required",
          description: "Please enter your name for the order",
          variant: "destructive",
        })
        return
      }
    }
    
    const email = currentUser?.email || loggedInPickupEmail.trim() || guestPickupEmail
    const userName = currentUser 
      ? loggedInPickupName.trim() || `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'Customer'
      : guestPickupName.trim()
    const phone = loggedInPickupPhone.trim() || currentUser?.phone || guestPickupPhone.trim()
    
    // For pickup, we don't need a delivery address - just the restaurant address
    const pickupAddress: DeliveryAddress = {
      street_address: restaurantAddress || restaurantName || 'Pickup at restaurant',
      postal_code: '',
      email: email,
      name: userName,
      phone: phone,
    }
    
    setSelectedAddress(pickupAddress)
    // Move to payment method selection - don't create payment intent yet
    console.log('[Checkout] Pickup confirmed, moving to payment method selection')
    setStep('payment-method')
  }

  // Handler for payment method selection
  const handlePaymentMethodSelected = async (paymentMethod: string) => {
    console.log('[Checkout] Payment method selected:', paymentMethod)
    setSelectedPaymentMethod(paymentMethod)
    
    // Track payment method selection for GA
    trackAddPaymentInfo(paymentMethod, total)

    if (paymentMethod === 'credit_card') {
      // Credit card: Create payment intent and go to Stripe payment form
      // Guard against duplicate payment intent creation (React Strict Mode, double-clicks, etc.)
      if (paymentIntentCreatingRef.current) {
        console.log('[Checkout] Payment intent creation already in progress, skipping duplicate call')
        return
      }
      
      paymentIntentCreatingRef.current = true
      console.log('[Checkout] Creating payment intent for credit card')
      try {
        // IMPORTANT: Re-fetch payment config right before creating payment intent
        // This ensures Stripe instance matches the current payment mode
        // (prevents mismatch when restaurant switches between test/live mode)
        console.log('[Checkout] Refreshing payment config before creating payment intent...')
        const configResponse = await fetch(`${getApiBaseUrl()}/api/customer/restaurants/${restaurantSlug}/payment-config`, {
          cache: 'no-store',
        })
        
        if (configResponse.ok) {
          const { publishableKey, paymentMode } = await configResponse.json()
          console.log('[Checkout] Fresh payment config - mode:', paymentMode, 'key:', publishableKey?.substring(0, 10))
          
          // Check if we need to reload Stripe with a different key
          if (publishableKey && !stripeCache.has(publishableKey)) {
            console.log('[Checkout] Loading Stripe with fresh key for', paymentMode, 'mode')
            const promise = loadStripe(publishableKey)
            stripeCache.set(publishableKey, promise)
            setStripePromise(promise)
          } else if (publishableKey) {
            // Ensure we're using the correct cached instance
            const cachedPromise = stripeCache.get(publishableKey)
            if (cachedPromise) {
              setStripePromise(cachedPromise)
            }
          }
        }
        
        const response = await fetch(`${getApiBaseUrl()}/api/customer/create-payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: total,
            user_id: currentUser?.id ? String(currentUser.id) : undefined,
            guest_email: selectedAddress?.email,
            metadata: {
              delivery_address: JSON.stringify(selectedAddress),
              restaurant_slug: restaurantSlug,
              guest_email: selectedAddress?.email,
              order_type: effectiveOrderType,
              service_time: JSON.stringify(pickupTime),
              order_notes: orderNotes.trim() || undefined,
              coupon_code: appliedPromo?.code || undefined,
              discount_amount: appliedPromo ? String(getDiscount()) : undefined,
              promo_id: appliedPromo?.promoId ? String(appliedPromo.promoId) : undefined,
              promo_type: appliedPromo?.promoType || undefined,
            }
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to create payment intent')
        }

        const data = await response.json()
        setClientSecret(data.clientSecret)
        setStep('payment')
      } catch (error: any) {
        // Reset ref so user can retry
        paymentIntentCreatingRef.current = false
        toast({
          title: "Error",
          description: error.message || "Failed to initialize payment",
          variant: "destructive",
        })
      }
    } else {
      // Non-card payment: Call cash order API directly
      console.log('[Checkout] Submitting cash order with payment type:', paymentMethod)
      setIsSubmittingCashOrder(true)
      
      try {
        // Format cart items as required by API
        const orderCartItems = items.map(item => ({
          dishId: item.dishId,
          quantity: item.quantity,
          size: item.size,
          modifiers: item.modifiers,
          specialInstructions: item.specialInstructions
        }))

        // Calculate delivery fee and tax for non-card orders
        const cashDeliveryFee = effectiveOrderType === 'delivery' ? effectiveDeliveryFee : 0
        const cashTax = tax

        const response = await fetch(`${getApiBaseUrl()}/api/customer/orders/cash`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_type: paymentMethod,
            delivery_address: selectedAddress,
            cart_items: orderCartItems,
            user_id: currentUser?.id ? String(currentUser.id) : undefined,
            guest_email: selectedAddress?.email,
            restaurant_slug: restaurantSlug,
            order_type: effectiveOrderType,
            service_time: pickupTime,
            delivery_fee: cashDeliveryFee,
            tax_amount: cashTax,
            order_notes: orderNotes.trim() || undefined
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to create order')
        }

        const data = await response.json()
        console.log('[Checkout] Cash order created:', data)
        
        // Track purchase event for GA before clearing cart
        const gaCartItems = items.map(item => ({
          id: item.dishId,
          name: item.dishName,
          price: item.sizePrice,
          quantity: item.quantity
        }))
        trackPurchase(String(data.order_id), total, gaCartItems, getTax(), getEffectiveDeliveryFee())
        
        // Set flag BEFORE clearing cart to prevent empty cart redirect
        setOrderPlacedSuccessfully(true)
        
        // Clear cart and redirect to confirmation
        clearCart()
        toast({
          title: "Order Placed!",
          description: `Your order has been placed successfully. Order #${data.order_id}`,
        })
        // Include token for guest order confirmation access
        const confirmationUrl = data.token 
          ? `/customer/orders/${data.order_id}/confirmation?token=${data.token}`
          : `/customer/orders/${data.order_id}/confirmation`
        router.push(confirmationUrl)
      } catch (error: any) {
        console.error('[Checkout] Cash order error:', error)
        toast({
          title: "Error",
          description: error.message || "Failed to place order",
          variant: "destructive",
        })
      } finally {
        setIsSubmittingCashOrder(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (items.length === 0 && !orderPlacedSuccessfully && !isResettingPassword) {
    return null // Will redirect to restaurant menu
  }

  if (isResettingPassword && items.length === 0) {
    const returnRestaurant = searchParams.get('restaurant')
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <ResetPasswordModal onPasswordReset={() => {
          isResettingPasswordRef.current = false
          router.replace(returnRestaurant ? `/r/${returnRestaurant}` : '/customer/login')
        }} />
      </div>
    )
  }

  // Compute minimum order violation for delivery (inline warning, not blocking redirect)
  // Pickup orders have no minimum requirement
  const isDeliveryMinViolation = effectiveOrderType === 'delivery' && subtotal < minOrder

  return (
    <AnalyticsProvider measurementId={gaMeasurementId}>
    <div className="min-h-screen bg-muted/30 overflow-x-hidden">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <Button variant="ghost" asChild data-testid="button-back-to-menu">
              <Link href={`/r/${restaurantSlug}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Back to {restaurantName}</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
            
            {/* Auth Section */}
            <div className="flex items-center gap-2 min-w-0">
              {currentUser ? (
                <div className="flex items-center gap-2 min-w-0">
                  <Link 
                    href="/customer/account?from=checkout" 
                    className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors min-w-0"
                    data-testid="link-account"
                  >
                    <User className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground hover:text-primary truncate max-w-[120px] sm:max-w-[200px]">
                      {currentUser.email || currentUser.first_name || 'Account'}
                    </span>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSignOut}
                    data-testid="button-sign-out"
                  >
                    <LogOut className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setShowSignInModal(true)}
                  data-testid="button-sign-in"
                  style={brandedButtonStyle}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Checkout</h1>
            {currentUser ? (
              <p className="text-lg text-primary font-medium">
                Welcome back, {currentUser.first_name || currentUser.email}! 👋
              </p>
            ) : (
              <p className="text-muted-foreground">Complete your order from {restaurantName}</p>
            )}
          </div>
        </div>

        {/* Pickup Only Banner - Show when only pickup is enabled (after config loads) */}
        {!serviceConfigLoading && isPickupOnly && (
          <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <Store className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <span className="font-medium">Pickup Order</span> — This restaurant only offers pickup. Your order will be ready for collection at the restaurant.
            </AlertDescription>
          </Alert>
        )}

        {/* Delivery Minimum Order Warning - Inline warning instead of blocking redirect */}
        {isDeliveryMinViolation && (
          <Alert className="mb-6 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              <span className="font-medium">Minimum order for delivery is ${minOrder.toFixed(2)}</span> — Your subtotal is ${subtotal.toFixed(2)}. Add ${(minOrder - subtotal).toFixed(2)} more or switch to pickup (no minimum).
              <Button asChild variant="link" className="h-auto p-0 ml-2 text-amber-700 dark:text-amber-300 underline">
                <Link href={`/r/${restaurantSlug}`}>Add more items</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Type Selector - Show skeleton while loading, then actual content */}
            <Card>
              <CardContent className="p-6">
                {serviceConfigLoading ? (
                  <div className="space-y-4">
                    {/* Skeleton for tabs */}
                    <Skeleton className="h-14 w-full rounded-md" />
                    {/* Skeleton for separator */}
                    <Skeleton className="h-px w-full" />
                    {/* Skeleton for time selector header */}
                    <Skeleton className="h-6 w-48" />
                    {/* Skeleton for time selection buttons */}
                    <div className="grid grid-cols-2 gap-4">
                      <Skeleton className="h-24 w-full rounded-lg" />
                      <Skeleton className="h-24 w-full rounded-lg" />
                    </div>
                  </div>
                ) : (
                  <OrderTypeSelector schedules={schedules} onDeliveryBlocked={setIsDeliveryBlocked} brandedColor={restaurantPrimaryColor || undefined} serviceConfig={serviceConfig || undefined} />
                )}
              </CardContent>
            </Card>

            {/* Progress Steps */}
            <Card>
              <CardContent className="p-6">
                <p className="text-xs text-muted-foreground mb-3" data-testid="text-step-indicator">
                  Step {step === 'address' ? '1' : step === 'payment-method' ? '2' : '3'} of 3
                </p>
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="flex flex-col items-center gap-1 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'address' ? 'bg-primary text-primary-foreground' : 'bg-green-500 text-white'}`}>
                      {effectiveOrderType === 'pickup' ? <ShoppingBag className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                    </div>
                    <span className={`text-[11px] sm:text-xs font-medium truncate max-w-[70px] sm:max-w-none text-center ${step === 'address' ? 'text-primary' : 'text-muted-foreground'}`}>
                      {effectiveOrderType === 'pickup' ? 'Details' : 'Address'}
                    </span>
                  </div>
                  <Separator className="flex-1" />
                  <div className="flex flex-col items-center gap-1 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'payment-method' ? 'bg-primary text-primary-foreground' : step === 'payment' ? 'bg-green-500 text-white' : 'bg-muted'}`}>
                      <Wallet className="w-4 h-4" />
                    </div>
                    <span className={`text-[11px] sm:text-xs font-medium truncate max-w-[70px] sm:max-w-none text-center ${step === 'payment-method' ? 'text-primary' : 'text-muted-foreground'}`}>
                      Method
                    </span>
                  </div>
                  <Separator className="flex-1" />
                  <div className="flex flex-col items-center gap-1 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'payment' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span className={`text-[11px] sm:text-xs font-medium truncate max-w-[70px] sm:max-w-none text-center ${step === 'payment' ? 'text-primary' : 'text-muted-foreground'}`}>
                      Payment
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step Content - Delivery Flow - Only show when not blocked */}
            {step === 'address' && effectiveOrderType === 'delivery' && !isDeliveryBlocked && (
              <CheckoutAddressForm 
                key={currentUser?.id || 'guest'} 
                userId={currentUser?.id}
                onAddressConfirmed={handleAddressConfirmed}
                onSignInClick={() => setShowSignInModal(true)}
                brandedButtonStyle={brandedButtonStyle}
              />
            )}
            
            {/* Step Content - Pickup Flow */}
            {step === 'address' && effectiveOrderType === 'pickup' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    Pickup Details
                  </CardTitle>
                  <CardDescription>
                    Pick up your order from {restaurantName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Restaurant Address */}
                  <div className="bg-muted/50 rounded-lg p-4" data-testid="text-pickup-address">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">{restaurantName}</p>
                        {restaurantAddress ? (
                          <p className="text-sm text-muted-foreground">{restaurantAddress}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Pickup address not available yet. Please contact the restaurant.</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Logged-in user info display + phone input if missing */}
                  {currentUser && (
                    <div className="space-y-4">
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Ordering as {currentUser.first_name || currentUser.email || currentUser.phone || 'Signed in user'}
                        </p>
                        {currentUser.email ? (
                          <p className="text-xs text-green-600 dark:text-green-400">{currentUser.email}</p>
                        ) : currentUser.phone ? (
                          <p className="text-xs text-green-600 dark:text-green-400">{currentUser.phone}</p>
                        ) : null}
                      </div>
                      
                      {/* Name/Email/Phone inputs for users missing details */}
                      {((!currentUser.first_name && !currentUser.last_name) || !currentUser.email || !currentUser.phone || currentUser.phone.trim().length < 7) && (
                        <div className="space-y-4">
                          {/* Name input if missing */}
                          {!currentUser.first_name && !currentUser.last_name && (
                            <div className="space-y-2">
                              <label htmlFor="loggedin-pickup-name" className="text-sm font-medium">
                                Your Name *
                              </label>
                              <input
                                type="text"
                                id="loggedin-pickup-name"
                                placeholder="John Smith"
                                autoComplete="name"
                                className="w-full px-3 py-2 border rounded-md"
                                data-testid="input-loggedin-pickup-name"
                                value={loggedInPickupName}
                                onChange={(e) => setLoggedInPickupName(e.target.value)}
                              />
                            </div>
                          )}
                          
                          {/* Phone input if missing */}
                          {(!currentUser.phone || currentUser.phone.trim().length < 7) && (
                            <div className="space-y-2">
                              <label htmlFor="loggedin-pickup-phone" className="text-sm font-medium">
                                Phone Number *
                              </label>
                              <input
                                type="tel"
                                id="loggedin-pickup-phone"
                                placeholder="(613) 555-1234"
                                autoComplete="tel"
                                className="w-full px-3 py-2 border rounded-md"
                                data-testid="input-loggedin-pickup-phone"
                                value={loggedInPickupPhone}
                                onChange={(e) => setLoggedInPickupPhone(e.target.value)}
                              />
                            </div>
                          )}
                          
                          {/* Email input if missing */}
                          {!currentUser.email && (
                            <div className="space-y-2">
                              <label htmlFor="loggedin-pickup-email" className="text-sm font-medium">
                                Email Address *
                              </label>
                              <input
                                type="email"
                                id="loggedin-pickup-email"
                                placeholder="your@email.com"
                                autoComplete="email"
                                className="w-full px-3 py-2 border rounded-md"
                                data-testid="input-loggedin-pickup-email"
                                value={loggedInPickupEmail}
                                onChange={(e) => setLoggedInPickupEmail(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground">
                                We'll send your order confirmation here
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Guest contact info for pickup */}
                  {!currentUser && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label htmlFor="guest-pickup-name" className="text-sm font-medium">
                            Your Name *
                          </label>
                          <input
                            type="text"
                            id="guest-pickup-name"
                            placeholder="John Smith"
                            autoComplete="name"
                            className="w-full px-3 py-2 border rounded-md"
                            data-testid="input-guest-pickup-name"
                            value={guestPickupName}
                            onChange={(e) => setGuestPickupName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="guest-pickup-phone" className="text-sm font-medium">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            id="guest-pickup-phone"
                            placeholder="(613) 555-1234"
                            autoComplete="tel"
                            className="w-full px-3 py-2 border rounded-md"
                            data-testid="input-guest-pickup-phone"
                            value={guestPickupPhone}
                            onChange={(e) => setGuestPickupPhone(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="guest-pickup-email" className="text-sm font-medium">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="guest-pickup-email"
                          placeholder="your@email.com"
                          autoComplete="email"
                          className="w-full px-3 py-2 border rounded-md"
                          data-testid="input-guest-pickup-email"
                          value={guestPickupEmail}
                          onChange={(e) => setGuestPickupEmail(e.target.value)}
                          onBlur={handleGuestEmailBlur}
                        />
                        <p className="text-xs text-muted-foreground">
                          We'll send your order confirmation to this email
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Order Notes (for all pickup orders) */}
                  <div className="space-y-2">
                    <label htmlFor="pickup-order-notes" className="text-sm font-medium">
                      Order Notes (optional)
                    </label>
                    <Textarea
                      id="pickup-order-notes"
                      placeholder="e.g., Extra napkins please, allergy info, etc."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      rows={2}
                      data-testid="input-pickup-order-notes"
                    />
                  </div>
                  
                  {/* Continue Button */}
                  <Button
                    onClick={handlePickupConfirmed}
                    className="w-full"
                    size="lg"
                    data-testid="button-continue-pickup"
                    style={brandedButtonStyle}
                  >
                    {total > 0 ? `Continue to Pay $${total.toFixed(2)}` : 'Continue to Payment'}
                  </Button>
                  
                  {/* Sign In Prompt for Guests */}
                  {!currentUser && (
                    <div className="text-center text-sm text-muted-foreground">
                      <span>Have an account? </span>
                      <button 
                        onClick={() => setShowSignInModal(true)}
                        className="text-primary hover:underline font-medium"
                        data-testid="button-signin-pickup"
                      >
                        Sign in
                      </button>
                      <span> for faster checkout</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step Content - Payment Method Selection */}
            {step === 'payment-method' && restaurantSlug && (
              <CheckoutPaymentSelection
                restaurantSlug={restaurantSlug}
                orderType={orderType}
                onSelect={handlePaymentMethodSelected}
                onBack={() => setStep('address')}
                brandedButtonStyle={brandedButtonStyle}
              />
            )}

            {/* Step Content - Stripe Payment (only for credit card) */}
            {/* Key by clientSecret to force remount when payment intent changes, avoiding Stripe's "immutable clientSecret" warning */}
            {step === 'payment' && clientSecret && selectedAddress && stripePromise && (
              <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutPaymentForm 
                  clientSecret={clientSecret}
                  deliveryAddress={selectedAddress}
                  userId={currentUser?.id?.toString()}
                  onBack={() => {
                    setStep('payment-method')
                    setClientSecret('')
                    paymentIntentCreatingRef.current = false // Reset so new payment intent can be created
                  }}
                  brandedButtonStyle={brandedButtonStyle}
                />
              </Elements>
            )}
            {/* Show loading if Stripe not ready yet */}
            {step === 'payment' && clientSecret && selectedAddress && !stripePromise && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full mr-3" />
                    <span className="text-muted-foreground">Loading payment...</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm" data-testid={`order-item-${item.id}`}>
                      <div className="flex-1">
                        <p className="font-medium">{item.quantity}x {item.dishName}</p>
                        {item.size && item.size !== 'Regular' && (
                          <p className="text-xs text-muted-foreground" data-testid={`text-order-item-size-${item.id}`}>
                            {item.size}
                          </p>
                        )}
                        {item.modifiers.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            + {item.modifiers.map(m => m.name).join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="font-medium">${item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Promo Code Input */}
                {restaurantSlug && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Promo Code</p>
                    <PromoCodeInput 
                      restaurantSlug={restaurantSlug} 
                      brandedButtonStyle={brandedButtonStyle}
                    />
                  </div>
                )}

                <Separator />

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span data-testid="text-subtotal">${subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount {appliedPromo?.code && `(${appliedPromo.code})`}</span>
                      <span data-testid="text-discount">-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  {effectiveOrderType === 'delivery' ? (
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span data-testid="text-delivery-fee">
                        {appliedPromo?.type === 'delivery' ? (
                          <span className="text-green-600">Free</span>
                        ) : (
                          `$${effectiveDeliveryFee.toFixed(2)}`
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-green-600">
                      <span>Pickup</span>
                      <span data-testid="text-delivery-fee">No fee</span>
                    </div>
                  )}
                  {getTaxBreakdown().map((taxItem, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{getTaxLabel(taxItem.type, taxItem.rate)}</span>
                      <span data-testid={`text-tax-${taxItem.type.toLowerCase()}`}>${taxItem.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span data-testid="text-total">${total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Sign In Modal */}
      <CheckoutSignInModal 
        open={showSignInModal}
        onOpenChange={setShowSignInModal}
        onSuccess={handleSignInSuccess}
      />

      {/* Password Reset Modal - shown when user clicks reset link from email */}
      <ResetPasswordModal onPasswordReset={handleSignInSuccess} />

    </div>
    </AnalyticsProvider>
  )
}
