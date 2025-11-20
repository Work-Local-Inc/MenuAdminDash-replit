"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useCartStore } from '@/lib/stores/cart-store'
import { PostOrderSignupModal } from '@/components/customer/post-order-signup-modal'
import { ArrowLeft, CreditCard } from 'lucide-react'

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
  email?: string
  phone?: string
}

interface CheckoutPaymentFormProps {
  clientSecret: string
  deliveryAddress: DeliveryAddress
  onBack: () => void
}

export function CheckoutPaymentForm({ clientSecret, deliveryAddress, onBack }: CheckoutPaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const { toast } = useToast()
  const { clearCart, restaurantSlug } = useCartStore()
  
  const [processing, setProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [completedOrderId, setCompletedOrderId] = useState<number | null>(null)
  const [guestEmail, setGuestEmail] = useState<string>('')

  const handleSignupModalClose = () => {
    setShowSignupModal(false)
    if (completedOrderId) {
      router.push(`/customer/orders/${completedOrderId}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/customer/order-confirmation`,
          payment_method_data: {
            billing_details: {
              address: {
                country: 'CA', // Canada - we're Canada-only
                postal_code: deliveryAddress.postal_code,
              }
            }
          }
        },
        redirect: 'if_required',
      })

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        })
        setProcessing(false)
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded, create order with cart items for server validation
        const { items } = useCartStore.getState()
        
        const orderResponse = await fetch('/api/customer/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_intent_id: paymentIntent.id,
            delivery_address: deliveryAddress,
            guest_email: deliveryAddress.email, // Required for guest checkout
            guest_phone: deliveryAddress.phone, // Phone number for guest checkout
            cart_items: items.map(item => ({
              dishId: item.dishId,
              size: item.size,
              quantity: item.quantity,
              modifiers: item.modifiers,
            })),
          }),
        })

        if (!orderResponse.ok) {
          const errorData = await orderResponse.json().catch(() => ({}))
          console.error('[Order Creation] Failed:', errorData)
          throw new Error(errorData.error || 'Failed to create order')
        }

        const order = await orderResponse.json()

        // Clear cart
        clearCart()

        toast({
          title: "Order Placed Successfully!",
          description: `Your order #${order.id} has been confirmed`,
        })

        // Store order ID for later redirect
        setCompletedOrderId(order.id)

        // Check if this is a guest order (has email in delivery address)
        if (deliveryAddress.email) {
          // Guest order - show signup modal
          setGuestEmail(deliveryAddress.email)
          setShowSignupModal(true)
        } else {
          // Logged-in user - redirect immediately
          router.push(`/customer/orders/${order.id}`)
        }
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      toast({
        title: "Error",
        description: error.message || "An error occurred processing your payment",
        variant: "destructive",
      })
      setProcessing(false)
    }
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Information
        </CardTitle>
        <CardDescription>
          Enter your payment details to complete your order
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delivery Address Confirmation */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm font-medium mb-1">Delivering to:</p>
          <p className="text-sm">
            {deliveryAddress.street_address}
            {deliveryAddress.unit && `, Unit ${deliveryAddress.unit}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {deliveryAddress.city_name}, {deliveryAddress.postal_code}
          </p>
          {deliveryAddress.delivery_instructions && (
            <p className="text-xs text-muted-foreground mt-2">
              Instructions: {deliveryAddress.delivery_instructions}
            </p>
          )}
        </div>

        {/* Payment Element */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <PaymentElement 
            onReady={() => setIsLoading(false)}
            options={{
              defaultValues: {
                billingDetails: {
                  address: {
                    country: 'CA', // Canada - this makes it show "Postal code" instead of "ZIP code"
                    postal_code: deliveryAddress.postal_code,
                  }
                }
              },
              fields: {
                billingDetails: {
                  email: 'auto',
                  address: {
                    country: 'never', // Hide country selector since we're Canada-only
                    postalCode: 'auto',
                  }
                }
              },
              terms: {
                card: 'never'
              }
            }}
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={processing}
              className="flex-1"
              data-testid="button-back-to-address"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              type="submit"
              disabled={!stripe || processing || isLoading}
              className="flex-1"
              size="lg"
              data-testid="button-place-order"
            >
              {isLoading ? "Loading..." : processing ? "Processing..." : "Place Order"}
            </Button>
          </div>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          Your payment is secured by Stripe. We never store your card details.
        </p>
      </CardContent>
    </Card>

    {/* Post-Order Signup Modal (Guest Users Only) */}
    <PostOrderSignupModal
      open={showSignupModal}
      onOpenChange={(open) => {
        if (!open) {
          // BUG FIX 2: Always redirect when modal closes (skip or ESC/click outside)
          handleSignupModalClose()
        }
      }}
      guestEmail={guestEmail}
      onSuccess={handleSignupModalClose}
    />
  </>
  )
}
