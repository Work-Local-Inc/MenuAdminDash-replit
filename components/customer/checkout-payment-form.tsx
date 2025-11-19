"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useCartStore } from '@/lib/stores/cart-store'
import { ArrowLeft, CreditCard } from 'lucide-react'

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
            cart_items: items.map(item => ({
              dishId: item.dishId,
              size: item.size,
              quantity: item.quantity,
              modifiers: item.modifiers,
            })),
          }),
        })

        if (!orderResponse.ok) {
          throw new Error('Failed to create order')
        }

        const order = await orderResponse.json()

        // Clear cart
        clearCart()

        toast({
          title: "Order Placed Successfully!",
          description: `Your order #${order.id} has been confirmed`,
        })

        // Redirect to order confirmation
        router.push(`/customer/orders/${order.id}`)
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
              fields: {
                billingDetails: {
                  email: 'auto',
                  address: {
                    country: 'never',
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
  )
}
