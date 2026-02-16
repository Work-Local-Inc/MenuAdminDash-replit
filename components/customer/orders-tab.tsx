"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { useCartStore } from '@/lib/stores/cart-store'
import { getApiBaseUrl } from '@/lib/api-utils'
import { Package, Clock, Store, Truck, RotateCcw, ChevronDown, ChevronUp, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface OrdersTabProps {
  userId: number
}

export function OrdersTab({ userId }: OrdersTabProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const addItem = useCartStore((state) => state.addItem)

  const [orders, setOrders] = useState<any[]>([])
  const [orderItems, setOrderItems] = useState<Record<number, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set())
  const [reorderingId, setReorderingId] = useState<number | null>(null)

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

      const ordersData = data || []
      setOrders(ordersData)

      if (ordersData.length > 0) {
        const orderIds = ordersData.map((o: any) => o.id)
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('id, order_id, dish_id, item_name, quantity, unit_price, total_price, customizations, special_instructions')
          .in('order_id', orderIds)
          .order('id', { ascending: true })

        if (itemsError) {
          console.error('Error loading order items:', itemsError)
        }

        if (!itemsError && items) {
          const grouped: Record<number, any[]> = {}
          items.forEach((item: any) => {
            if (!grouped[item.order_id]) grouped[item.order_id] = []
            grouped[item.order_id].push(item)
          })
          setOrderItems(grouped)
        }
      }
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

  const toggleExpanded = (orderId: number) => {
    setExpandedOrders(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  const handleReorder = async (order: any) => {
    const items = orderItems[order.id]
    if (!items || items.length === 0) {
      toast({ variant: "destructive", title: "No items to reorder" })
      return
    }

    setReorderingId(order.id)

    try {
      const slug = order.restaurant?.slug || `restaurant-${order.restaurant_id}`
      const res = await fetch(`${getApiBaseUrl()}/api/customer/restaurants/${slug}/menu`, { credentials: 'include' })
      let menuDishes: any[] = []
      if (res.ok) {
        const menuData = await res.json()
        if (menuData.courses) {
          for (const course of menuData.courses) {
            if (course.dishes) menuDishes.push(...course.dishes)
          }
        }
      }

      let addedCount = 0
      let skippedCount = 0

      for (const item of items) {
        const menuDish = menuDishes.find((d: any) => d.id === item.dish_id)
        if (!menuDish || !menuDish.is_active) {
          skippedCount++
          continue
        }

        if (menuDish.hidden_days?.length > 0) {
          const today = new Date().getDay()
          if (menuDish.hidden_days.includes(today)) {
            skippedCount++
            continue
          }
        }

        const defaultSize = menuDish.dish_sizes?.[0]
        addItem({
          dishId: menuDish.id,
          dishName: item.item_name,
          dishImage: menuDish.image_url,
          size: defaultSize?.size_name || 'Regular',
          sizePrice: defaultSize?.price || item.unit_price,
          quantity: item.quantity,
          modifiers: [],
          specialInstructions: item.special_instructions || undefined,
        })
        addedCount++
      }

      if (addedCount > 0 && skippedCount === 0) {
        toast({ title: `Added ${addedCount} item${addedCount > 1 ? 's' : ''} to your cart` })
      } else if (addedCount > 0 && skippedCount > 0) {
        toast({
          title: `Added ${addedCount} item${addedCount > 1 ? 's' : ''} to your cart`,
          description: `${skippedCount} item${skippedCount > 1 ? 's are' : ' is'} no longer available.`,
        })
      } else {
        toast({ title: "These items are no longer available on the menu.", variant: "destructive" })
      }
    } catch (error) {
      console.error('Reorder error:', error)
      toast({ variant: "destructive", title: "Failed to reorder", description: "Please try again." })
    } finally {
      setReorderingId(null)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'delivered': case 'completed': return 'default'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  const formatStatus = (status: string) => {
    return status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown'
  }

  const parseAddress = (addr: any) => {
    if (!addr) return null
    try {
      const parsed = typeof addr === 'string' ? JSON.parse(addr) : addr
      const parts = []
      if (parsed.street_address) parts.push(parsed.street_address)
      if (parsed.unit) parts.push(`Unit ${parsed.unit}`)
      if (parsed.city_name) parts.push(parsed.city_name)
      return parts.join(', ')
    } catch { return null }
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
      {orders.map((order) => {
        const items = orderItems[order.id] || []
        const isExpanded = expandedOrders.has(order.id)
        const deliveryAddr = parseAddress(order.delivery_address)
        const isDelivery = order.order_type === 'delivery'
        const previewItems = items.slice(0, 3)
        const hasMoreItems = items.length > 3

        return (
          <Card key={order.id} data-testid={`order-card-${order.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  {order.restaurant?.logo_url && (
                    <img
                      src={order.restaurant.logo_url}
                      alt={order.restaurant.name}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold truncate" data-testid={`text-restaurant-name-${order.id}`}>
                      {order.restaurant?.name || 'Restaurant'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      {order.order_number && (
                        <span>#{order.order_number}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={getStatusBadgeVariant(order.order_status || order.status)} data-testid={`badge-status-${order.id}`}>
                    {formatStatus(order.order_status || order.status)}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 pb-3">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1.5">
                  {isDelivery ? (
                    <>
                      <Truck className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{deliveryAddr || 'Delivery'}</span>
                    </>
                  ) : (
                    <>
                      <Store className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Pickup</span>
                    </>
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{order.payment_status === 'paid' ? 'Paid' : order.payment_status || 'Pending'}</span>
                </span>
              </div>

              <Separator className="mb-3" />

              <div className="space-y-1.5">
                {(isExpanded ? items : previewItems).map((item: any) => {
                  const mods = item.customizations
                    ? (typeof item.customizations === 'string' ? JSON.parse(item.customizations) : item.customizations)
                    : null
                  const modNames = Array.isArray(mods)
                    ? mods.map((m: any) => m.name || m.modifier_name).filter(Boolean)
                    : []

                  return (
                    <div key={item.id} className="flex items-start justify-between gap-2 text-sm">
                      <div className="flex gap-2 min-w-0">
                        <span className="text-muted-foreground flex-shrink-0">{item.quantity}x</span>
                        <div className="min-w-0">
                          <span className="truncate block">{item.item_name}</span>
                          {modNames.length > 0 && (
                            <span className="text-xs text-muted-foreground truncate block">
                              {modNames.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-muted-foreground flex-shrink-0">
                        ${parseFloat(item.total_price || 0).toFixed(2)}
                      </span>
                    </div>
                  )
                })}

                {hasMoreItems && !isExpanded && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(order.id)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline pt-1"
                    data-testid={`button-show-more-${order.id}`}
                  >
                    <ChevronDown className="w-3 h-3" />
                    {items.length - 3} more item{items.length - 3 > 1 ? 's' : ''}
                  </button>
                )}
                {hasMoreItems && isExpanded && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(order.id)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline pt-1"
                    data-testid={`button-show-less-${order.id}`}
                  >
                    <ChevronUp className="w-3 h-3" />
                    Show less
                  </button>
                )}
              </div>

              <Separator className="my-3" />

              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Total</span>
                <span data-testid={`text-order-total-${order.id}`}>
                  ${parseFloat(order.total_amount || 0).toFixed(2)}
                </span>
              </div>
            </CardContent>

            <CardFooter className="pt-0 gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleReorder(order)}
                disabled={reorderingId === order.id || items.length === 0}
                data-testid={`button-reorder-${order.id}`}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                {reorderingId === order.id ? 'Adding...' : 'Reorder'}
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
