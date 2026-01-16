"use client"

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/stores/cart-store'
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
    appliedPromo
  } = useCartStore()
  
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
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [isDeliveryBlocked, setIsDeliveryBlocked] = useState(false)
  const [isSubmittingCashOrder, setIsSubmittingCashOrder] = useState(false)
  const [orderPlacedSuccessfully, setOrderPlacedSuccessfully] = useState(false) // Prevent empty cart redirect after order
  const [serviceConfig, setServiceConfig] = useState<{ has_delivery_enabled?: boolean; pickup_enabled?: boolean } | null>(null)
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
        const response = await fetch(`/api/customer/restaurants/${restaurantSlug}/payment-config`)
        
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
      const profilePromise = fetch('/api/customer/profile', { credentials: 'include' })
        .then(res => res.ok ? res.json() : { user: null })
        .catch(() => ({ user: null }))
      
      // Fetch restaurant data only if we have a slug
      let schedulesPromise: Promise<any> = Promise.resolve({ schedules: [] })
      let restaurantPromise: Promise<any> = Promise.resolve(null)
      
      if (restaurantSlug) {
        schedulesPromise = fetch(`/api/customer/restaurants/${restaurantSlug}/schedules`)
          .then(res => res.ok ? res.json() : { schedules: [] })
          .catch(() => ({ schedules: [] }))
        
        restaurantPromise = fetch(`/api/customer/restaurants/${restaurantSlug}`)
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
          setCurrentUser(profileData.user)
        } else {
          console.log('[Checkout] No user profile - Guest checkout mode')
          setCurrentUser(null)
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
        // User just signed in - refresh user data only
        try {
          const response = await fetch('/api/customer/profile', { credentials: 'include' })
          if (response.ok) {
            const { user: userData } = await response.json()
            setCurrentUser(userData)
          }
        } catch (error) {
          console.error('[Checkout] Auth refresh error:', error)
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [restaurantSlug])

  useEffect(() => {
    // Redirect if cart is empty (but NOT if order was just placed successfully)
    if (!loading && items.length === 0 && !orderPlacedSuccessfully) {
      toast({
        title: "Cart is empty",
        description: "Add items to your cart before checking out",
        variant: "destructive",
      })
      router.push(restaurantSlug ? `/r/${restaurantSlug}` : '/')
    }
  }, [items, loading, restaurantSlug, router, toast, orderPlacedSuccessfully])

  // Hydrate gaMeasurementId if missing (handles direct checkout entry from saved cart)
  const { setGaMeasurementId } = useCartStore()
  useEffect(() => {
    if (!gaMeasurementId && restaurantSlug) {
      fetch(`/api/customer/restaurants/${restaurantSlug}/analytics`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.ga_measurement_id) {
            setGaMeasurementId(data.ga_measurement_id)
          }
        })
        .catch(() => {})
    }
  }, [gaMeasurementId, restaurantSlug, setGaMeasurementId])

  // Track begin_checkout event when checkout page loads with items and GA is ready
  const hasTrackedBeginCheckout = useRef(false)
  useEffect(() => {
    if (!loading && items.length > 0 && gaMeasurementId && !hasTrackedBeginCheckout.current) {
      hasTrackedBeginCheckout.current = true
      const cartItems = items.map(item => ({
        id: item.dishId,
        name: item.dishName,
        price: item.sizePrice,
        quantity: item.quantity
      }))
      trackBeginCheckout(cartItems, getTotal())
    }
  }, [loading, items, gaMeasurementId])

  const subtotal = getSubtotal()
  const discount = getDiscount()
  const effectiveDeliveryFee = getEffectiveDeliveryFee()
  const tax = getTax()
  const total = getTotal()

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
      if (!guestPickupEmail || !guestPickupEmail.includes('@')) {
        toast({
          title: "Email required",
          description: "Please enter a valid email address",
          variant: "destructive",
        })
        return
      }
    } else {
      // For logged-in users, phone is still required
      // Prefer inline entry if provided, otherwise fall back to profile phone
      const userPhone = loggedInPickupPhone.trim() || currentUser.phone || ''
      if (!userPhone || userPhone.length < 7) {
        toast({
          title: "Phone required",
          description: "Please enter your phone number so the restaurant can contact you",
          variant: "destructive",
        })
        return
      }
    }
    
    const email = currentUser?.email || guestPickupEmail
    // Build full name from first_name and last_name if available
    const userName = currentUser 
      ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'Customer'
      : guestPickupName.trim()
    // Prefer inline phone entry if provided, otherwise fall back to profile/guest phone
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
    trackAddPaymentInfo(paymentMethod, getTotal())

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
        const response = await fetch('/api/customer/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: total,
            subtotal: subtotal, // Include subtotal for 'net' commission calculation
            user_id: currentUser?.id ? String(currentUser.id) : undefined,
            guest_email: selectedAddress?.email,
            metadata: {
              delivery_address: JSON.stringify(selectedAddress),
              restaurant_slug: restaurantSlug,
              guest_email: selectedAddress?.email,
              order_type: orderType,
              service_time: JSON.stringify(pickupTime),
              order_notes: orderNotes.trim() || undefined,
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
        const cashDeliveryFee = orderType === 'delivery' ? effectiveDeliveryFee : 0
        const cashTax = tax

        const response = await fetch('/api/customer/orders/cash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_type: paymentMethod,
            delivery_address: selectedAddress,
            cart_items: orderCartItems,
            user_id: currentUser?.id ? String(currentUser.id) : undefined,
            guest_email: selectedAddress?.email,
            restaurant_slug: restaurantSlug,
            order_type: orderType,
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
        trackPurchase(String(data.order_id), getTotal(), gaCartItems, getTax(), getEffectiveDeliveryFee())
        
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

  if (items.length === 0 && !orderPlacedSuccessfully) {
    return null // Will redirect to restaurant menu
  }

  // Compute minimum order violation for delivery (inline warning, not blocking redirect)
  // Pickup orders have no minimum requirement
  const isDeliveryMinViolation = effectiveOrderType === 'delivery' && subtotal < minOrder

  return (
    <AnalyticsProvider measurementId={gaMeasurementId}>
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" asChild data-testid="button-back-to-menu">
              <Link href={`/r/${restaurantSlug}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {restaurantName}
              </Link>
            </Button>
            
            {/* Auth Section */}
            <div className="flex items-center gap-3">
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <Link 
                    href="/customer/account?from=checkout" 
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                    data-testid="link-account"
                  >
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground hover:text-primary">
                      {currentUser.email || currentUser.first_name || 'Account'}
                    </span>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSignOut}
                    data-testid="button-sign-out"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
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
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 ${step === 'address' ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'address' ? 'bg-primary text-primary-foreground' : 'bg-green-500 text-white'}`}>
                      {effectiveOrderType === 'pickup' ? <ShoppingBag className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                    </div>
                    <span className="font-medium hidden sm:inline">
                      {effectiveOrderType === 'pickup' ? 'Pickup' : 'Address'}
                    </span>
                  </div>
                  <Separator className="flex-1" />
                  <div className={`flex items-center gap-2 ${step === 'payment-method' ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'payment-method' ? 'bg-primary text-primary-foreground' : step === 'payment' ? 'bg-green-500 text-white' : 'bg-muted'}`}>
                      <Wallet className="w-4 h-4" />
                    </div>
                    <span className="font-medium hidden sm:inline">Method</span>
                  </div>
                  <Separator className="flex-1" />
                  <div className={`flex items-center gap-2 ${step === 'payment' ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'payment' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span className="font-medium hidden sm:inline">Payment</span>
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
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">{restaurantName}</p>
                        {restaurantAddress ? (
                          <p className="text-sm text-muted-foreground">{restaurantAddress}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Address will be provided after ordering</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Logged-in user info display + phone input if missing */}
                  {currentUser && (
                    <div className="space-y-4">
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Ordering as {currentUser.first_name || currentUser.email}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">{currentUser.email}</p>
                      </div>
                      
                      {/* Phone input for logged-in users missing phone */}
                      {(!currentUser.phone || currentUser.phone.trim().length < 7) && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
                          <div>
                            <p className="font-semibold text-sm text-amber-800 dark:text-amber-200">Phone number required</p>
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              The restaurant needs your phone number to contact you about your order.
                            </p>
                          </div>
                          <input
                            type="tel"
                            placeholder="(613) 555-1234"
                            autoComplete="tel"
                            className="w-full px-3 py-2 border rounded-md"
                            data-testid="input-loggedin-pickup-phone"
                            value={loggedInPickupPhone}
                            onChange={(e) => setLoggedInPickupPhone(e.target.value)}
                          />
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
                    Continue to Payment
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
                        <p className="text-xs text-muted-foreground">{item.size}</p>
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
    </div>
    </AnalyticsProvider>
  )
}
