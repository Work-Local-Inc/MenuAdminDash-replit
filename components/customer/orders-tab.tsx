"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Package, ChevronRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface OrdersTabProps {
  userId: number
}

export function OrdersTab({ userId }: OrdersTabProps) {
  const { toast } = useToast()
  const supabase = createClient()
  
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [userId])

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurant:restaurants(id, name, slug, logo_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setOrders(data || [])
    } catch (error: any) {
      console.error('Error loading orders:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load orders",
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
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No orders yet</h3>
          <p className="text-muted-foreground mb-6">
            Start exploring restaurants and place your first order!
          </p>
          <Button asChild data-testid="button-browse-restaurants">
            <Link href="/">Browse Restaurants</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id} className="hover-elevate" data-testid={`order-card-${order.id}`}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">
                  Order #{order.id}
                </CardTitle>
                <Badge variant={getStatusBadgeVariant(order.status)}>
                  {order.status}
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold" data-testid={`order-total-${order.id}`}>
                ${parseFloat(order.total_amount || 0).toFixed(2)}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {order.restaurant?.logo_url && (
                  <img 
                    src={order.restaurant.logo_url} 
                    alt={order.restaurant.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                )}
                <div>
                  <p className="font-medium">{order.restaurant?.name}</p>
                  {order.delivery_address && (
                    <p className="text-sm text-muted-foreground">
                      {typeof order.delivery_address === 'string' 
                        ? JSON.parse(order.delivery_address).street_address
                        : order.delivery_address.street_address}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" asChild data-testid={`button-view-order-${order.id}`}>
                <Link href={`/customer/orders/${order.id}`}>
                  View Details
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
