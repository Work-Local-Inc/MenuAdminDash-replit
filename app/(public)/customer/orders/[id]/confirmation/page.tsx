"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, MapPin, Phone, Store, Package, Home, Clock, Mail, Utensils } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { PostOrderSignupModal } from '@/components/customer/post-order-signup-modal'
import { useCartStore } from '@/lib/stores/cart-store'

interface OrderItem {
  dish_id: number
  name: string
  size: string
  quantity: number
  unit_price: number
  subtotal: number
  modifiers?: Array<{
    id: number
    name: string
    price: number
  }>
}

interface ServiceTime {
  type: 'asap' | 'scheduled'
  scheduledTime?: string
}

interface DeliveryAddress {
  name?: string
  street?: string
  street_address?: string
  unit?: string
  city?: string
  city_name?: string
  province?: string
  postal_code?: string
  delivery_instructions?: string
  service_time?: ServiceTime
}

interface Restaurant {
  id: number
  name: string
  phone: string | null
  address: string | null
  city: string | null
  province: string | null
  postal_code: string | null
}

interface Order {
  id: number
  user_id: number | null
  is_guest_order: boolean
  guest_email: string | null
  guest_name: string | null
  restaurant_id: number
  order_type: 'delivery' | 'pickup'
  payment_status: string
  stripe_payment_intent_id: string
  total_amount: string
  subtotal: string
  delivery_fee: string
  tax_amount: string
  items: OrderItem[]
  delivery_address: DeliveryAddress
  delivery_instructions: string | null
  created_at: string
  current_status: string
  restaurant: Restaurant
}

export default function OrderConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { clearCart } = useCartStore()
  
  const orderId = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSignupModal, setShowSignupModal] = useState(false)

  useEffect(() => {
    // Clear cart when confirmation page loads (order completed successfully)
    clearCart()
    
    if (orderId) {
      loadOrderDetails()
    }
  }, [orderId, clearCart])

  const loadOrderDetails = async () => {
    try {
      // Get token from URL for guest orders
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')
      
      const apiUrl = token 
        ? `/api/customer/orders/${orderId}?token=${token}`
        : `/api/customer/orders/${orderId}`
      
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Order not found')
        }
        if (response.status === 403) {
          throw new Error('Access denied. Please check your link.')
        }
        throw new Error('Failed to load order')
      }

      const data = await response.json()
      setOrder(data)

      // Show signup modal for guest orders after a short delay
      if (data.is_guest_order && data.guest_email) {
        setTimeout(() => {
          setShowSignupModal(true)
        }, 2000)
      }
    } catch (error: any) {
      console.error('Error loading order:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load order details",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return 'default'
      case 'cancelled':
        return 'destructive'
      case 'pending':
      case 'confirmed':
      case 'preparing':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" data-testid="loading-spinner" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Order Not Found</h3>
              <p className="text-muted-foreground mb-6">
                We couldn't find this order. Please check your order confirmation email.
              </p>
              <Button asChild data-testid="button-home">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Homepage
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const deliveryAddress = order.delivery_address
  const isPickup = order.order_type === 'pickup'
  const serviceTime = deliveryAddress?.service_time
  
  // Format the estimated time based on ASAP vs scheduled
  const getEstimatedTimeText = () => {
    if (serviceTime?.type === 'scheduled' && serviceTime.scheduledTime) {
      const scheduledDate = new Date(serviceTime.scheduledTime)
      return format(scheduledDate, 'MMM d, yyyy \'at\' h:mm a')
    }
    return isPickup ? 'ASAP (Ready for pickup)' : 'ASAP (45-60 minutes)'
  }
  const estimatedDeliveryTime = getEstimatedTimeText()

  return (
    <>
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Success Hero Section */}
          <Card className="mb-6 border-2 border-primary/20">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-primary" data-testid="icon-success" />
              </div>
              <h1 className="text-3xl font-bold mb-2" data-testid="heading-order-confirmed">
                Order Confirmed!
              </h1>
              <p className="text-muted-foreground mb-4">
                Your order from <strong>{order.restaurant.name}</strong> has been received and is being prepared.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                  <p className="text-2xl font-bold font-mono" data-testid="text-order-number">
                    #{order.id}
                  </p>
                </div>
                <Separator orientation="vertical" className="hidden sm:block h-12" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {isPickup ? 'Pickup Time' : 'Estimated Delivery'}
                  </p>
                  <p className="text-lg font-semibold text-primary" data-testid="text-estimated-delivery">
                    {estimatedDeliveryTime}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What Happens Next Section */}
          <Card className="mb-6 bg-primary/5 border-primary/20" data-testid="card-what-happens-next">
            <CardHeader>
              <CardTitle className="text-lg">What Happens Next?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Utensils className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium mb-1">Restaurant is preparing your order</p>
                    <p className="text-sm text-muted-foreground">
                      {order.restaurant.name} has received your order and will start preparing it shortly.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium mb-1">
                      {isPickup ? `Ready for pickup: ${estimatedDeliveryTime}` : `Estimated delivery: ${estimatedDeliveryTime}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isPickup 
                        ? `Head to ${order.restaurant.name} to pick up your order.`
                        : `Your food will be delivered to ${deliveryAddress.street || deliveryAddress.street_address}.`
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium mb-1">Order confirmation sent</p>
                    <p className="text-sm text-muted-foreground">
                      We've sent a confirmation email to {order.is_guest_order ? order.guest_email : 'your email'} with your order details.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Restaurant Details */}
              <Card data-testid="card-restaurant-details">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    Restaurant
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium text-lg" data-testid="text-restaurant-name">
                    {order.restaurant.name}
                  </p>
                  {order.restaurant.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {order.restaurant.phone}
                    </p>
                  )}
                  {order.restaurant.address && (
                    <p className="text-sm text-muted-foreground">
                      {order.restaurant.address}
                      {order.restaurant.city && `, ${order.restaurant.city}`}
                      {order.restaurant.province && ` ${order.restaurant.province}`}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Delivery/Pickup Information */}
              <Card data-testid="card-delivery-info">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {isPickup ? <Store className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                    {isPickup ? 'Pickup Location' : 'Delivery Address'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isPickup ? (
                    <>
                      <p className="font-medium text-lg">{order.restaurant.name}</p>
                      {order.restaurant.address && (
                        <p className="text-sm">
                          {order.restaurant.address}
                        </p>
                      )}
                      {(order.restaurant.city || order.restaurant.province) && (
                        <p className="text-sm text-muted-foreground">
                          {order.restaurant.city && order.restaurant.city}
                          {order.restaurant.province && `, ${order.restaurant.province}`}
                          {order.restaurant.postal_code && ` ${order.restaurant.postal_code}`}
                        </p>
                      )}
                      {order.restaurant.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                          <Phone className="w-4 h-4" />
                          {order.restaurant.phone}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      {deliveryAddress.name && (
                        <p className="font-medium">{deliveryAddress.name}</p>
                      )}
                      <p className="text-sm">
                        {deliveryAddress.street || deliveryAddress.street_address}
                        {deliveryAddress.unit && `, Unit ${deliveryAddress.unit}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {deliveryAddress.city || deliveryAddress.city_name}, {deliveryAddress.province} {deliveryAddress.postal_code}
                      </p>
                      {(deliveryAddress.delivery_instructions || order.delivery_instructions) && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Delivery Instructions:</p>
                          <p className="text-sm">
                            {deliveryAddress.delivery_instructions || order.delivery_instructions}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Order Status */}
              <Card data-testid="card-order-status">
                <CardHeader>
                  <CardTitle>Order Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Status:</span>
                    <Badge variant={getStatusBadgeVariant(order.current_status)} data-testid="badge-current-status">
                      {getStatusLabel(order.current_status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll send you updates via email as your order progresses.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Order placed: {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Order Items & Pricing */}
            <div className="space-y-6">
              {/* Order Items */}
              <Card data-testid="card-order-items">
                <CardHeader>
                  <CardTitle>Order Details</CardTitle>
                  <CardDescription>{order.items.length} item(s)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="space-y-2" data-testid={`order-item-${index}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="shrink-0 no-default-hover-elevate no-default-active-elevate">
                              {item.quantity}x
                            </Badge>
                            <div>
                              <p className="font-medium leading-tight">{item.name}</p>
                              <p className="text-sm text-muted-foreground">{item.size}</p>
                            </div>
                          </div>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="ml-12 mt-1 space-y-0.5">
                              {item.modifiers.map((mod, modIndex) => (
                                <p key={modIndex} className="text-xs text-muted-foreground">
                                  + {mod.name} ${Number(mod.price).toFixed(2)}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="font-medium shrink-0" data-testid={`item-total-${index}`}>
                          ${Number(item.subtotal).toFixed(2)}
                        </p>
                      </div>
                      {index < order.items.length - 1 && <Separator />}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Price Breakdown */}
              <Card data-testid="card-price-breakdown">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span data-testid="text-subtotal">${parseFloat(order.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {isPickup ? 'Pickup' : 'Delivery Fee'}
                    </span>
                    <span data-testid="text-delivery-fee" className={isPickup ? 'text-green-600' : ''}>
                      {isPickup ? 'Free' : `$${parseFloat(order.delivery_fee).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">HST (13%)</span>
                    <span data-testid="text-tax">${parseFloat(order.tax_amount).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Paid</span>
                    <span data-testid="text-total">${parseFloat(order.total_amount).toFixed(2)}</span>
                  </div>
                  <div className="pt-2">
                    <Badge variant="default" className="w-full justify-center no-default-hover-elevate no-default-active-elevate">
                      Payment Confirmed
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-center">
            <Button asChild variant="default" size="lg" data-testid="button-continue-browsing">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Continue Browsing
              </Link>
            </Button>
          </div>

          {/* Thank You Message */}
          <Card className="mt-6 bg-muted/50">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Thank you for your order! We appreciate your business.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Questions? Contact the restaurant directly or reach out to Menu.ca support.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Post-Order Signup Modal for Guests */}
      {order.is_guest_order && order.guest_email && (
        <PostOrderSignupModal
          open={showSignupModal}
          onOpenChange={setShowSignupModal}
          guestEmail={order.guest_email}
          onSuccess={() => {
            toast({
              title: "Account Created!",
              description: "You can now track your orders and enjoy faster checkout.",
            })
          }}
        />
      )}
    </>
  )
}
