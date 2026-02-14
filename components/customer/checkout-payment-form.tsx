"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStripe, useElements, PaymentElement, ExpressCheckoutElement } from '@stripe/react-stripe-js'
import { StripeExpressCheckoutElementConfirmEvent } from '@stripe/stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useCartStore } from '@/lib/stores/cart-store'
import { PostOrderSignupModal } from '@/components/customer/post-order-signup-modal'
import { CardScannerModal } from '@/components/customer/card-scanner-modal'
import { isMobileDevice, hasCamera } from '@/lib/utils/device'
import { ScannedCardData } from '@/lib/utils/card-scanner'
import { ArrowLeft, CreditCard, Camera, Shield, MapPin, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { trackPurchase } from '@/lib/analytics'
import { getApiBaseUrl } from '@/lib/api-utils'

function OrderConfirmationBlock({ deliveryAddress }: { deliveryAddress: DeliveryAddress }) {
  const { orderType, restaurantName, restaurantAddress } = useCartStore();
  
  if (orderType === 'pickup') {
    return (
      <div className="bg-muted/50 p-4 rounded-lg">
        <p className="text-sm font-medium mb-1 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" />
          Order for pickup
        </p>
        <p className="text-sm font-medium">
          {restaurantName}
        </p>
        {restaurantAddress && (
          <p className="text-sm text-muted-foreground">
            {restaurantAddress}
          </p>
        )}
      </div>
    );
  }
  
  return (
    <div className="bg-muted/50 p-4 rounded-lg">
      <p className="text-sm font-medium mb-1 flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        Delivering to:
      </p>
      <p className="text-sm">
        {deliveryAddress.street_address}
        {deliveryAddress.unit && `, Unit ${deliveryAddress.unit}`}
      </p>
      <p className="text-sm text-muted-foreground">
        {deliveryAddress.city_name || deliveryAddress.city}, {deliveryAddress.postal_code}
      </p>
      {deliveryAddress.delivery_instructions && (
        <p className="text-xs text-muted-foreground mt-2">
          Instructions: {deliveryAddress.delivery_instructions}
        </p>
      )}
    </div>
  );
}

interface DeliveryAddress {
  id?: number
  address_label?: string
  street_address: string
  unit?: string
  city_id?: number
  city_name?: string
  city?: string
  province?: string
  postal_code: string
  delivery_instructions?: string
  email?: string
  name?: string
  phone?: string
}

interface CheckoutPaymentFormProps {
  clientSecret: string
  deliveryAddress: DeliveryAddress
  userId?: string
  onBack: () => void
  brandedButtonStyle?: React.CSSProperties
}

export function CheckoutPaymentForm({ clientSecret, deliveryAddress, userId, onBack, brandedButtonStyle }: CheckoutPaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const { toast } = useToast()
  const { clearCart, restaurantSlug, restaurantPrimaryColor, items, getTotal, getTax, getEffectiveDeliveryFee } = useCartStore()
  
  const buttonStyle = brandedButtonStyle || (restaurantPrimaryColor 
    ? { backgroundColor: restaurantPrimaryColor, borderColor: restaurantPrimaryColor }
    : undefined)
  
  const [processing, setProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isPaymentComplete, setIsPaymentComplete] = useState(false)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [completedOrderId, setCompletedOrderId] = useState<number | null>(null)
  const [guestEmail, setGuestEmail] = useState<string>('')
  const [showScanModal, setShowScanModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [hasCameraAccess, setHasCameraAccess] = useState(false)
  const [showExpressCheckout, setShowExpressCheckout] = useState(false)

  useEffect(() => {
    setIsMobile(isMobileDevice());
    setHasCameraAccess(hasCamera());
  }, [])

  const handleSignupModalClose = () => {
    setShowSignupModal(false)
    if (completedOrderId) {
      router.push(`/customer/orders/${completedOrderId}/confirmation`)
    }
  }

  const handleCardScanned = async (cardData: ScannedCardData) => {
    console.log('[Payment] Card scanned:', { 
      lastFour: cardData.cardNumber.slice(-4),
      hasExpiry: !!(cardData.expiryMonth && cardData.expiryYear)
    });
    
    toast({
      title: 'Card Detected',
      description: `Card ending in ${cardData.cardNumber.slice(-4)} - Please verify details in the form`,
    });
    
    console.log('[Payment] Scanned card number:', cardData.cardNumber.replace(/.(?=.{4})/g, '*'));
  }

  const createOrderAfterPayment = useCallback(async (paymentIntentId: string) => {
    setCreatingOrder(true)
    
    try {
      const { items } = useCartStore.getState()
      
      const orderPayload = {
        payment_intent_id: paymentIntentId,
        delivery_address: deliveryAddress,
        guest_email: deliveryAddress.email,
        user_id: userId,
        restaurant_slug: restaurantSlug,
        cart_items: items.map(item => ({
          dishId: item.dishId,
          size: item.size,
          quantity: item.quantity,
          modifiers: item.modifiers,
          specialInstructions: item.specialInstructions,
        })),
      };
      
      console.log('[Payment] Creating order with userId:', userId, 'Payment Intent ID:', paymentIntentId);
      
      const orderResponse = await fetch(`${getApiBaseUrl()}/api/customer/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}))
        console.error('[Order Creation] Failed:', errorData)
        throw new Error(errorData.error || 'Failed to create order')
      }

      const order = await orderResponse.json()

      const currentItems = useCartStore.getState().items
      const cartItems = currentItems.map(item => ({
        id: item.dishId,
        name: item.dishName,
        price: item.sizePrice,
        quantity: item.quantity
      }))
      trackPurchase(String(order.id), getTotal(), cartItems, getTax(), getEffectiveDeliveryFee())

      const confirmationUrl = deliveryAddress.email
        ? `/customer/orders/${order.id}/confirmation?token=${paymentIntentId}`
        : `/customer/orders/${order.id}/confirmation`
      
      console.log('[Checkout] Redirecting to confirmation:', confirmationUrl)
      window.location.href = confirmationUrl
    } catch (error: any) {
      console.error('Order creation error:', error)
      toast({
        title: "Error",
        description: error.message || "An error occurred creating your order",
        variant: "destructive",
      })
      setCreatingOrder(false)
      setProcessing(false)
    }
  }, [deliveryAddress, userId, restaurantSlug, getTotal, getTax, getEffectiveDeliveryFee, toast])

  const handleExpressCheckoutConfirm = useCallback(async (event: StripeExpressCheckoutElementConfirmEvent) => {
    if (!stripe || !elements) return

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
        await createOrderAfterPayment(paymentIntent.id)
      }
    } catch (error: any) {
      console.error('Express checkout error:', error)
      toast({
        title: "Error",
        description: error.message || "An error occurred processing your payment",
        variant: "destructive",
      })
      setProcessing(false)
    }
  }, [stripe, elements, toast, createOrderAfterPayment])

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
                country: 'CA',
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
        await createOrderAfterPayment(paymentIntent.id)
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      toast({
        title: "Error",
        description: error.message || "An error occurred processing your payment",
        variant: "destructive",
      })
      setProcessing(false)
      setCreatingOrder(false)
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
        <OrderConfirmationBlock deliveryAddress={deliveryAddress} />

        {/* Express Checkout - Native Apple Pay / Google Pay buttons */}
        <div className={showExpressCheckout ? '' : 'hidden'}>
          <ExpressCheckoutElement
            onReady={({ availablePaymentMethods }) => {
              console.log('[Express Checkout] onReady fired, availablePaymentMethods:', JSON.stringify(availablePaymentMethods))
              if (availablePaymentMethods) {
                const hasWallet = availablePaymentMethods.applePay || availablePaymentMethods.googlePay
                setShowExpressCheckout(!!hasWallet)
                console.log('[Express Checkout] hasWallet:', hasWallet, 'applePay:', availablePaymentMethods.applePay, 'googlePay:', availablePaymentMethods.googlePay)
              } else {
                console.log('[Express Checkout] No payment methods available - element will be hidden')
              }
            }}
            onLoadError={(event) => {
              console.error('[Express Checkout] Load error:', JSON.stringify(event.error))
            }}
            onConfirm={handleExpressCheckoutConfirm}
            onClick={({ resolve }) => {
              resolve()
            }}
            options={{
              buttonType: {
                applePay: 'plain',
                googlePay: 'pay',
              },
              buttonHeight: 48,
              layout: {
                maxColumns: 2,
                maxRows: 1,
                overflow: 'never',
              },
              paymentMethods: {
                applePay: 'always',
                googlePay: 'always',
                link: 'never',
                amazonPay: 'never',
                paypal: 'never',
              }
            }}
          />
        </div>

        {showExpressCheckout && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or pay with card
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isMobile && hasCameraAccess && (
            <>
              <div className="flex items-center justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setShowScanModal(true)}
                  className="w-full"
                  data-testid="button-scan-card"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Scan Card for Quick Entry
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or enter card details
                  </span>
                </div>
              </div>
            </>
          )}

          <PaymentElement 
            onReady={() => setIsLoading(false)}
            onChange={(event) => {
              setIsPaymentComplete(event.complete)
            }}
            options={{
              defaultValues: {
                billingDetails: {
                  name: deliveryAddress.name || undefined,
                  email: deliveryAddress.email || undefined,
                  phone: deliveryAddress.phone || undefined,
                  address: {
                    country: 'CA',
                    postal_code: deliveryAddress.postal_code,
                  }
                }
              },
              fields: {
                billingDetails: {
                  email: 'auto',
                  address: {
                    country: 'never',
                    postalCode: 'auto',
                  }
                }
              },
              wallets: {
                link: 'never',
                applePay: 'never',
                googlePay: 'never',
              },
              paymentMethodOrder: ['card'],
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
              disabled={!stripe || processing || isLoading || !isPaymentComplete}
              className={cn(
                "flex-1",
                (!isPaymentComplete && !isLoading && !processing) && "opacity-50 cursor-not-allowed"
              )}
              size="lg"
              data-testid="button-place-order"
              style={(!isPaymentComplete && !isLoading && !processing) ? undefined : buttonStyle}
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

    <PostOrderSignupModal
      open={showSignupModal}
      onOpenChange={(open) => {
        if (!open) {
          handleSignupModalClose()
        }
      }}
      guestEmail={guestEmail}
      guestName={deliveryAddress.name}
      guestPhone={deliveryAddress.phone}
      onSuccess={handleSignupModalClose}
    />

    {creatingOrder && (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center" data-testid="loading-order-creation">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 pb-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto">
              <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Creating Your Order...</h3>
              <p className="text-sm text-muted-foreground">
                Please wait while we finalize your order. You'll be redirected shortly.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )}

    <CardScannerModal
      isOpen={showScanModal}
      onClose={() => setShowScanModal(false)}
      onCardScanned={handleCardScanned}
    />
  </>
  )
}
