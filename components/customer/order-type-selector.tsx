"use client"

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCartStore, OrderType } from '@/lib/stores/cart-store'
import { Truck, ShoppingBag } from 'lucide-react'

interface OrderTypeSelectorProps {
  className?: string
}

export function OrderTypeSelector({ className }: OrderTypeSelectorProps) {
  const { orderType, setOrderType, getEffectiveDeliveryFee } = useCartStore()
  const effectiveDeliveryFee = getEffectiveDeliveryFee()

  return (
    <div className={className}>
      <Tabs 
        value={orderType} 
        onValueChange={(value) => setOrderType(value as OrderType)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 h-14">
          <TabsTrigger 
            value="delivery" 
            className="flex flex-col items-center gap-0.5 h-full py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            data-testid="tab-delivery"
          >
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              <span className="font-medium">Delivery</span>
            </div>
            {orderType === 'delivery' && effectiveDeliveryFee > 0 && (
              <span className="text-xs opacity-80">${effectiveDeliveryFee.toFixed(2)} fee</span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="pickup" 
            className="flex flex-col items-center gap-0.5 h-full py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            data-testid="tab-pickup"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span className="font-medium">Pickup</span>
            </div>
            <span className="text-xs opacity-80">No fee</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
