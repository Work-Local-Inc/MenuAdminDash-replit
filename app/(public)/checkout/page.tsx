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
import { CheckoutAddressForm } from '@/components/customer/checkout-address-form'
import { CheckoutPaymentForm } from '@/components/customer/checkout-payment-form'
import { useToast } from '@/hooks/use-toast'
import { ShoppingCart, MapPin, CreditCard, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || process.env.VITE_STRIPE_PUBLIC_KEY
if (!stripeKey) {
  throw new Error('Missing required Stripe key: NEXT_PUBLIC_STRIPE_PUBLIC_KEY or VITE_STRIPE_PUBLIC_KEY')
}
const stripePromise = loadStripe(stripeKey)

interface DeliveryAddress {
  id?: number
  address_label?: string
  street_address: string
  unit?: string
  city_id: number
  city_name?: string
  postal_code: string
  delivery_instructions?: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  
  const { items, restaurantName, restaurantSlug, getSubtotal, deliveryFee, getTax, getTotal, minOrder } = useCartStore()
  
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'address' | 'payment'>('address')
  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddress | null>(null)
  const [clientSecret, setClientSecret] = useState<string>('')

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Redirect to customer signup/login
        router.push(`/customer/login?redirect=/checkout`)
        return
      }

      console.log('[Checkout] Auth user:', user.id)

      // Get full user details (query by auth_user_id, not id)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      console.log('[Checkout] User lookup:', { userData, userError })

      if (!userData) {
        console.error('[Checkout] No user found for auth_user_id:', user.id)
        toast({
          title: "Account Error",
          description: "Your account setup is incomplete. Please contact support.",
          variant: "destructive"
        })
        return
      }

      setCurrentUser(userData)
    } catch (error) {
      console.error('Auth check error:', error)
      router.push(`/customer/login?redirect=/checkout`)
    } finally {
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
  const tax = getTax()
  const total = getTotal()

  const handleAddressConfirmed = async (address: DeliveryAddress) => {
    setSelectedAddress(address)
    
    // Create payment intent
    try {
      const response = await fetch('/api/customer/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          metadata: {
            delivery_address: JSON.stringify(address),
            restaurant_slug: restaurantSlug,
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create payment intent')
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
          <Button variant="ghost" asChild className="mb-4" data-testid="button-back-to-menu">
            <Link href={`/r/${restaurantSlug}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {restaurantName}
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="text-muted-foreground">Complete your order from {restaurantName}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Steps */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 ${step === 'address' ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'address' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="font-medium">Delivery Address</span>
                  </div>
                  <Separator className="flex-1" />
                  <div className={`flex items-center gap-2 ${step === 'payment' ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'payment' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span className="font-medium">Payment</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step Content */}
            {step === 'address' && (
              <CheckoutAddressForm 
                userId={currentUser?.id}
                onAddressConfirmed={handleAddressConfirmed}
              />
            )}

            {step === 'payment' && clientSecret && selectedAddress && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutPaymentForm 
                  clientSecret={clientSecret}
                  deliveryAddress={selectedAddress}
                  onBack={() => setStep('address')}
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

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span data-testid="text-subtotal">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span data-testid="text-delivery-fee">${deliveryFee.toFixed(2)}</span>
                  </div>
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
    </div>
  )
}
