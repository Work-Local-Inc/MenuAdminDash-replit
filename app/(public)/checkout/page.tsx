"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/stores/cart-store'
import { createClient } from '@/lib/supabase/client'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckoutAddressForm } from '@/components/customer/checkout-address-form'
import { CheckoutPaymentForm } from '@/components/customer/checkout-payment-form'
import { CheckoutPaymentSelection } from '@/components/customer/checkout-payment-selection'
import { CheckoutSignInModal } from '@/components/customer/checkout-signin-modal'
import { OrderTypeSelector } from '@/components/customer/order-type-selector'
import { Schedule } from '@/components/customer/pickup-time-selector'
import { PromoCodeInput } from '@/components/customer/promo-code-input'
import { useToast } from '@/hooks/use-toast'
import { ShoppingCart, MapPin, CreditCard, ArrowLeft, LogIn, LogOut, User, ShoppingBag, Store, Wallet, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

// Use production Stripe key if available, fall back to test key
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || 
                  process.env.NEXT_PUBLIC_TESTING_VITE_STRIPE_PUBLIC_KEY

if (!stripeKey) {
  throw new Error('Missing Stripe publishable key. Set NEXT_PUBLIC_STRIPE_PUBLIC_KEY or NEXT_PUBLIC_TESTING_VITE_STRIPE_PUBLIC_KEY in environment variables.')
}

console.log('[Checkout] Using Stripe publishable key:', stripeKey.substring(0, 10) + '...')
const stripePromise = loadStripe(stripeKey)

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
    getSubtotal, 
    getDiscount,
    getEffectiveDeliveryFee, 
    getTax, 
    getTotal, 
    minOrder,
    orderType,
    pickupTime,
    clearCart,
    appliedPromo
  } = useCartStore()
  
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
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [isDeliveryBlocked, setIsDeliveryBlocked] = useState(false)
  const [isSubmittingCashOrder, setIsSubmittingCashOrder] = useState(false)
  const [serviceConfig, setServiceConfig] = useState<{ has_delivery_enabled?: boolean; pickup_enabled?: boolean } | null>(null)
  const [serviceConfigLoading, setServiceConfigLoading] = useState(true) // Start as loading to prevent flash

  // Derived checkout mode - determines if we're in pickup-only, delivery-only, or both mode
  const isPickupOnly = serviceConfig && !serviceConfig.has_delivery_enabled && serviceConfig.pickup_enabled
  const isDeliveryOnly = serviceConfig && serviceConfig.has_delivery_enabled && !serviceConfig.pickup_enabled
  const effectiveOrderType = isPickupOnly ? 'pickup' : (isDeliveryOnly ? 'delivery' : orderType)

  // Debug: Log currentUser changes
  useEffect(() => {
    console.log('[Checkout] ⭐ currentUser state changed:', currentUser ? { id: currentUser.id, email: currentUser.email, first_name: currentUser.first_name } : 'null')
  }, [currentUser])

  // Debug: Log loading state changes
  useEffect(() => {
    console.log('[Checkout] ⭐ loading state changed:', loading)
  }, [loading])
  
  // Fetch restaurant schedules and service config for time slot validation
  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (!restaurantSlug) {
        setServiceConfigLoading(false)
        return
      }
      
      setSchedulesLoading(true)
      setServiceConfigLoading(true)
      try {
        // Fetch schedules
        const schedulesResponse = await fetch(`/api/customer/restaurants/${restaurantSlug}/schedules`)
        if (schedulesResponse.ok) {
          const data = await schedulesResponse.json()
          console.log('[Checkout] Schedules loaded:', data.schedules?.length || 0)
          setSchedules(data.schedules || [])
        } else {
          console.warn('[Checkout] Failed to fetch schedules, using defaults')
        }
        
        // Fetch service config (delivery/pickup enabled flags)
        const restaurantResponse = await fetch(`/api/customer/restaurants/${restaurantSlug}`)
        console.log('[Checkout] Restaurant API response status:', restaurantResponse.status)
        if (restaurantResponse.ok) {
          const restaurantData = await restaurantResponse.json()
          console.log('[Checkout] Restaurant data keys:', Object.keys(restaurantData))
          console.log('[Checkout] delivery_and_pickup_configs raw:', restaurantData.delivery_and_pickup_configs)
          const config = restaurantData.delivery_and_pickup_configs?.[0] || restaurantData.delivery_and_pickup_configs
          console.log('[Checkout] Parsed config:', config)
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
        } else {
          console.warn('[Checkout] ⚠️ Restaurant API returned error:', restaurantResponse.status)
        }
      } catch (error) {
        console.error('[Checkout] Error fetching restaurant data:', error)
      } finally {
        setSchedulesLoading(false)
        setServiceConfigLoading(false)
      }
    }
    
    fetchRestaurantData()
  }, [restaurantSlug])

  useEffect(() => {
    checkAuth()
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Checkout] Auth state changed:', event, session?.user?.id)
      
      if (event === 'SIGNED_IN' && session?.user) {
        // User just signed in - refresh user data
        await checkAuth()
      } else if (event === 'SIGNED_OUT') {
        // User signed out - clear user data
        setCurrentUser(null)
      }
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const checkAuth = async () => {
    try {
      console.log('[Checkout] Starting auth check via API...')
      
      // Use API endpoint instead of direct query to bypass RLS issues
      const response = await fetch('/api/customer/profile', {
        credentials: 'include', // Include auth cookies
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      
      const { user: userData } = await response.json()
      
      if (!userData) {
        console.log('[Checkout] No user profile - Guest checkout mode')
        setCurrentUser(null)
      } else {
        console.log('[Checkout] User profile loaded:', userData.id, userData.email, userData.first_name)
        setCurrentUser(userData)
      }
    } catch (error: any) {
      console.error('[Checkout] Auth check error:', error)
      // Don't redirect on error - allow guest checkout
      setCurrentUser(null)
    } finally {
      console.log('[Checkout] Setting loading to false')
      setLoading(false)
    }
  }

  useEffect(() => {
    // Redirect if cart is empty
    if (!loading && items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add items to your cart before checking out",
        variant: "destructive",
      })
      router.push(restaurantSlug ? `/r/${restaurantSlug}` : '/')
    }
  }, [items, loading, restaurantSlug, router, toast])

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
      setStep('address') // Go back to address to recreate payment intent with new user
    }
    
    toast({
      title: "Welcome back!",
      description: clientSecret ? "Please confirm your address again." : "Loading your saved addresses...",
    })
  }

  const handleAddressConfirmed = async (address: DeliveryAddress) => {
    setSelectedAddress(address)
    // Move to payment method selection - don't create payment intent yet
    console.log('[Checkout] Address confirmed, moving to payment method selection')
    setStep('payment-method')
  }
  
  // Handler for pickup flow - go to payment method selection
  const handlePickupConfirmed = async () => {
    // For guests, validate email
    const email = currentUser?.email || guestPickupEmail
    if (!currentUser && (!email || !email.includes('@'))) {
      toast({
        title: "Email required",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }
    
    // For pickup, we don't need a delivery address - just the restaurant address
    const pickupAddress: DeliveryAddress = {
      street_address: restaurantAddress || restaurantName || 'Pickup at restaurant',
      postal_code: '',
      email: email,
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

    if (paymentMethod === 'credit_card') {
      // Credit card: Create payment intent and go to Stripe payment form
      console.log('[Checkout] Creating payment intent for credit card')
      try {
        const response = await fetch('/api/customer/create-payment-intent', {
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
              order_type: orderType,
              service_time: JSON.stringify(pickupTime),
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
        const cartItems = items.map(item => ({
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
            cart_items: cartItems,
            user_id: currentUser?.id ? String(currentUser.id) : undefined,
            guest_email: selectedAddress?.email,
            restaurant_slug: restaurantSlug,
            order_type: orderType,
            service_time: pickupTime,
            delivery_fee: cashDeliveryFee,
            tax_amount: cashTax
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to create order')
        }

        const data = await response.json()
        console.log('[Checkout] Cash order created:', data)
        
        // Clear cart and redirect to confirmation
        clearCart()
        toast({
          title: "Order Placed!",
          description: `Your order has been placed successfully. Order #${data.orderId}`,
        })
        router.push(`/customer/orders/${data.orderId}/confirmation`)
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

  if (items.length === 0) {
    return null // Will redirect
  }

  // Check minimum order
  if (subtotal < minOrder) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Minimum Order Not Met</CardTitle>
            <CardDescription>
              The minimum order for {restaurantName} is ${minOrder.toFixed(2)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Your current subtotal is ${subtotal.toFixed(2)}. Please add ${(minOrder - subtotal).toFixed(2)} more to your order.
            </p>
            <Button asChild data-testid="button-back-to-menu">
              <Link href={`/r/${restaurantSlug}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Menu
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
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
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {currentUser.email || currentUser.first_name || 'Account'}
                    </span>
                  </div>
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
                  
                  {/* Guest Email for pickup */}
                  {!currentUser && (
                    <div className="space-y-2">
                      <label htmlFor="guest-pickup-email" className="text-sm font-medium">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="guest-pickup-email"
                        placeholder="your@email.com"
                        className="w-full px-3 py-2 border rounded-md"
                        data-testid="input-guest-pickup-email"
                        value={guestPickupEmail}
                        onChange={(e) => setGuestPickupEmail(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        We'll send your order confirmation to this email
                      </p>
                    </div>
                  )}
                  
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
            {step === 'payment' && clientSecret && selectedAddress && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutPaymentForm 
                  clientSecret={clientSecret}
                  deliveryAddress={selectedAddress}
                  userId={currentUser?.id?.toString()}
                  onBack={() => {
                    setStep('payment-method')
                    setClientSecret('')
                  }}
                  brandedButtonStyle={brandedButtonStyle}
                />
              </Elements>
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
                  <div className="flex justify-between">
                    <span>Tax (HST 13%)</span>
                    <span data-testid="text-tax">${tax.toFixed(2)}</span>
                  </div>
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
  )
}
