"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useCartStore } from '@/lib/stores/cart-store'
import { PostOrderSignupModal } from '@/components/customer/post-order-signup-modal'
import { CardScannerModal } from '@/components/customer/card-scanner-modal'
import { isMobileDevice, hasCamera } from '@/lib/utils/device'
import { ScannedCardData } from '@/lib/utils/card-scanner'
import { ArrowLeft, CreditCard, Camera, Shield } from 'lucide-react'

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
}

interface CheckoutPaymentFormProps {
  clientSecret: string
  deliveryAddress: DeliveryAddress
  userId?: string
  onBack: () => void
  brandedButtonStyle?: React.CSSProperties // Restaurant branding
}

export function CheckoutPaymentForm({ clientSecret, deliveryAddress, userId, onBack, brandedButtonStyle }: CheckoutPaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const { toast } = useToast()
  const { clearCart, restaurantSlug, restaurantPrimaryColor } = useCartStore()
  
  // Use passed style or create from store
  const buttonStyle = brandedButtonStyle || (restaurantPrimaryColor 
    ? { backgroundColor: restaurantPrimaryColor, borderColor: restaurantPrimaryColor }
    : undefined)
  
  const [processing, setProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [completedOrderId, setCompletedOrderId] = useState<number | null>(null)
  const [guestEmail, setGuestEmail] = useState<string>('')
  const [saveCard, setSaveCard] = useState(false)
  const [showScanModal, setShowScanModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [hasCameraAccess, setHasCameraAccess] = useState(false)

  // Detect mobile device on mount
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
    
    // Note: Stripe Elements doesn't allow programmatic card data population for security
    // Instead, we'll show the scanned data and let user verify/correct in the form
    toast({
      title: 'Card Detected',
      description: `Card ending in ${cardData.cardNumber.slice(-4)} - Please verify details in the form`,
    });
    
    // Store scanned data for reference (could be used for validation)
    console.log('[Payment] Scanned card number:', cardData.cardNumber.replace(/.(?=.{4})/g, '*'));
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
        // If user wants to save card, set it up for future use
        if (saveCard && userId) {
          try {
            console.log('[Payment] User opted to save card')
            // Note: Stripe automatically saves payment methods when setup_future_usage is set
            // This is handled in the payment intent creation on the backend
          } catch (error) {
            console.error('[Payment] Error saving card:', error)
            // Don't fail the order if card saving fails
          }
        }
        // Payment succeeded, show loading state while creating order
        setCreatingOrder(true)
        
        // Payment succeeded, create order with cart items for server validation
        const { items } = useCartStore.getState()
        
        const orderPayload = {
          payment_intent_id: paymentIntent.id,
          delivery_address: deliveryAddress,
          guest_email: deliveryAddress.email, // Required for guest checkout
          user_id: userId, // Include user_id to match payment intent metadata
          cart_items: items.map(item => ({
            dishId: item.dishId,
            size: item.size,
            quantity: item.quantity,
            modifiers: item.modifiers,
          })),
        };
        
        console.log('[Payment] Creating order with userId:', userId, 'Payment Intent ID:', paymentIntent.id);
        
        const orderResponse = await fetch('/api/customer/orders', {
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

        // Build confirmation URL with payment intent as secure token for guest orders
        const confirmationUrl = deliveryAddress.email
          ? `/customer/orders/${order.id}/confirmation?token=${paymentIntent.id}`
          : `/customer/orders/${order.id}/confirmation`
        
        console.log('[Checkout] Redirecting to confirmation:', confirmationUrl)
        
        // Use hard redirect for reliable navigation to confirmation page
        // Note: Cart will be cleared on confirmation page to avoid triggering
        // the "cart is empty" redirect logic before we can navigate away
        window.location.href = confirmationUrl
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
          {/* Scan Card Button - Mobile Only */}
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
                    Or enter manually
                  </span>
                </div>
              </div>
            </>
          )}

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

          {/* Save Card Checkbox (Only for logged-in users) */}
          {userId && (
            <div className="flex items-start space-x-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <Checkbox
                id="save-card"
                checked={saveCard}
                onCheckedChange={(checked) => setSaveCard(checked as boolean)}
                data-testid="checkbox-save-card"
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor="save-card"
                  className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                >
                  <Shield className="w-4 h-4 text-primary" />
                  Save card for faster checkout
                </Label>
                <p className="text-xs text-muted-foreground">
                  Securely save this card with Stripe for quicker future purchases
                </p>
              </div>
            </div>
          )}

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
              style={buttonStyle}
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

    {/* Full-screen loading overlay during order creation */}
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

    {/* Card Scanning Modal - Mobile Only */}
    <CardScannerModal
      isOpen={showScanModal}
      onClose={() => setShowScanModal(false)}
      onCardScanned={handleCardScanned}
    />
  </>
  )
}
