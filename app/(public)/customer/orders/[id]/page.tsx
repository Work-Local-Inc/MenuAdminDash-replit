"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, MapPin, Clock, CreditCard, Package } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  
  const orderId = params.id
  const [order, setOrder] = useState<any>(null)
  const [statusHistory, setStatusHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) {
      loadOrderDetails()
    }
  }, [orderId])

  const loadOrderDetails = async () => {
    try {
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/customer/login?redirect=/customer/orders/${orderId}`)
        return
      }

      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          restaurant:restaurants(id, name, slug, logo_url, phone)
        `)
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single()

      if (orderError) throw orderError

      setOrder(orderData)

      // Fetch status history
      const { data: historyData, error: historyError } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })

      if (historyError) throw historyError

      setStatusHistory(historyData || [])
    } catch (error: any) {
      console.error('Error loading order:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load order details",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'default'
      case 'cancelled':
        return 'destructive'
      case 'pending':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Order Not Found</h3>
            <p className="text-muted-foreground mb-6">
              We couldn't find this order.
            </p>
            <Button asChild>
              <Link href="/customer/account">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Orders
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const deliveryAddress = typeof order.delivery_address === 'string' 
    ? JSON.parse(order.delivery_address)
    : order.delivery_address

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <Button variant="ghost" asChild className="mb-4" data-testid="button-back">
          <Link href="/customer/account">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Link>
        </Button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Order #{order.id}</h1>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(order.status)} data-testid="badge-order-status">
                {order.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Placed {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">Total</p>
            <p className="text-3xl font-bold" data-testid="text-order-total">
              ${parseFloat(order.total_amount || 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Restaurant Info */}
          <Card>
            <CardHeader>
              <CardTitle>Restaurant</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {order.restaurant?.logo_url && (
                  <img 
                    src={order.restaurant.logo_url} 
                    alt={order.restaurant.name}
                    className="w-16 h-16 rounded object-cover"
                  />
                )}
                <div>
                  <p className="font-medium text-lg">{order.restaurant?.name}</p>
                  {order.restaurant?.phone && (
                    <p className="text-sm text-muted-foreground">
                      {order.restaurant.phone}
                    </p>
                  )}
                  <Button variant="link" asChild className="h-auto p-0 mt-1">
                    <Link href={`/r/${order.restaurant?.slug}`}>
                      View Menu
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address */}
          {deliveryAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {deliveryAddress.street_address}
                  {deliveryAddress.unit && `, Unit ${deliveryAddress.unit}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {deliveryAddress.city_name || 'Toronto'}, {deliveryAddress.postal_code}
                </p>
                {deliveryAddress.delivery_instructions && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Instructions: {deliveryAddress.delivery_instructions}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {order.payment_status === 'paid' ? 'Paid' : 'Payment Status'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.stripe_payment_intent_id}
                  </p>
                </div>
                <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                  {order.payment_status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Order Status Timeline */}
          {statusHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statusHistory.map((status, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted'}`} />
                        {index < statusHistory.length - 1 && (
                          <div className="w-0.5 flex-1 bg-muted my-1" style={{ minHeight: '1rem' }} />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium capitalize">{status.status.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(status.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                        {status.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {status.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
