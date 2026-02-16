"use client"

import { useEffect, useState } from 'react'
import { RotateCcw, ShoppingCart, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/stores/cart-store'
import { useToast } from '@/hooks/use-toast'
import { getApiBaseUrl } from '@/lib/api-utils'
import { format } from 'date-fns'

interface OrderAgainSectionProps {
  restaurantSlug: string
  restaurantId: number
  courses: any[]
  brandColor: string
}

interface PastOrderItem {
  id: number
  dish_id: number
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
  customizations: any
  special_instructions: string | null
}

interface PastOrder {
  id: number
  order_number: string
  total_amount: number
  status: string
  created_at: string
  order_type: string
  items: PastOrderItem[]
}

export function OrderAgainSection({ restaurantSlug, restaurantId, courses, brandColor }: OrderAgainSectionProps) {
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reorderingId, setReorderingId] = useState<number | null>(null)
  const addItem = useCartStore((state) => state.addItem)
  const { toast } = useToast()

  useEffect(() => {
    const fetchPastOrders = async () => {
      try {
        const profileRes = await fetch(`${getApiBaseUrl()}/api/customer/profile`, { credentials: 'include' })
        if (!profileRes.ok) {
          setIsLoading(false)
          return
        }

        const profileData = await profileRes.json()
        if (!profileData?.user?.id) {
          setIsLoading(false)
          return
        }

        const ordersRes = await fetch(`${getApiBaseUrl()}/api/customer/restaurants/${restaurantSlug}/past-orders`, { credentials: 'include' })
        if (!ordersRes.ok) {
          setIsLoading(false)
          return
        }

        const ordersData = await ordersRes.json()
        if (ordersData?.orders && ordersData.orders.length > 0) {
          const ordersWithItems = ordersData.orders.filter((o: PastOrder) => o.items && o.items.length > 0)
          setPastOrders(ordersWithItems.slice(0, 3))
        }
      } catch (error) {
        console.error('[OrderAgain] Error fetching past orders:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPastOrders()
  }, [restaurantSlug])

  const findDishInMenu = (dishId: number) => {
    for (const course of courses) {
      const dish = course.dishes?.find((d: any) => d.id === dishId)
      if (dish) return dish
    }
    return null
  }

  const isDishAvailable = (dish: any): boolean => {
    if (!dish.is_active) return false
    if (dish.hidden_days && dish.hidden_days.length > 0) {
      const today = new Date().getDay()
      if (dish.hidden_days.includes(today)) return false
    }
    return true
  }

  const handleReorder = (order: PastOrder) => {
    setReorderingId(order.id)

    let addedCount = 0
    let skippedCount = 0

    for (const item of order.items) {
      const dish = findDishInMenu(item.dish_id)
      if (!dish || !isDishAvailable(dish)) {
        skippedCount += 1
        continue
      }

      const defaultSize = dish.dish_sizes?.[0]

      addItem({
        dishId: dish.id,
        dishName: item.item_name,
        dishImage: dish.image_url,
        size: defaultSize?.size_name || 'Regular',
        sizePrice: defaultSize?.price || item.unit_price,
        quantity: item.quantity,
        modifiers: [],
        specialInstructions: item.special_instructions || undefined,
      })

      addedCount += 1
    }

    if (addedCount > 0 && skippedCount === 0) {
      toast({
        title: `Added ${addedCount} item${addedCount > 1 ? 's' : ''} to your cart`,
      })
    } else if (addedCount > 0 && skippedCount > 0) {
      toast({
        title: `Added ${addedCount} item${addedCount > 1 ? 's' : ''} to your cart`,
        description: `${skippedCount} item${skippedCount > 1 ? 's are' : ' is'} no longer available.`,
      })
    } else {
      toast({
        title: "These items are no longer available on the menu.",
        variant: "destructive",
      })
    }

    setReorderingId(null)
  }

  if (isLoading || pastOrders.length === 0) {
    return null
  }

  return (
    <div data-testid="section-order-again" className="border-b bg-card/50">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center gap-2 mb-3">
          <RotateCcw className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Order Again</h3>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {pastOrders.map((order) => {
            const displayItems = order.items.slice(0, 4)
            const remainingCount = order.items.length - displayItems.length

            return (
              <Card
                key={order.id}
                data-testid={`card-past-order-${order.id}`}
                className="w-72 sm:w-80 flex-shrink-0 p-0 flex flex-col"
              >
                <div className="p-3 pb-2 flex-1">
                  <div
                    data-testid={`text-order-items-${order.id}`}
                    className="space-y-1 mb-2"
                  >
                    {displayItems.map((item, idx) => (
                      <div key={item.id || idx} className="flex items-start justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">{item.quantity}x {item.item_name}</span>
                        <span className="text-muted-foreground flex-shrink-0 tabular-nums">
                          ${Number(item.total_price || 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {remainingCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        +{remainingCount} more item{remainingCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <span>{format(new Date(order.created_at), 'MMM d, yyyy')}</span>
                    <span className="font-medium text-foreground text-sm">
                      ${Number(order.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="px-3 pb-3">
                  <Button
                    data-testid={`button-reorder-${order.id}`}
                    size="sm"
                    className="text-white w-full"
                    style={{ backgroundColor: brandColor }}
                    onClick={() => handleReorder(order)}
                    disabled={reorderingId === order.id}
                  >
                    {reorderingId === order.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <ShoppingCart className="w-4 h-4 mr-1" />
                    )}
                    Reorder
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
