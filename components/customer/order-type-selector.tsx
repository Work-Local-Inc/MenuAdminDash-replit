"use client"

import { useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCartStore, OrderType } from '@/lib/stores/cart-store'
import { Truck, ShoppingBag, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, getDay, setHours, setMinutes } from 'date-fns'
import { Schedule } from './pickup-time-selector'

interface OrderTypeSelectorProps {
  className?: string
  schedules?: Schedule[]
  onDeliveryBlocked?: (isBlocked: boolean) => void
}

// Check if restaurant is currently open for a service type
// Handles overnight schedules by checking if we're in a late-night window from previous day
function isServiceOpen(schedules: Schedule[], serviceType: 'delivery' | 'takeout'): { 
  isOpen: boolean; 
  opensAt?: string; 
  closesAt?: string;
  hasAnySchedules: boolean;
} {
  const relevantSchedules = schedules?.filter(s => s.type === serviceType && s.is_enabled) || [];
  
  if (!schedules || schedules.length === 0 || relevantSchedules.length === 0) {
    return { isOpen: true, hasAnySchedules: false }; // Assume open if no schedules configured
  }
  
  const now = new Date();
  const currentDay = getDay(now);
  const previousDay = (currentDay + 6) % 7; // Previous day (0-6)
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Helper to check if a schedule matches a given day
  const matchesDay = (schedule: Schedule, day: number): boolean => {
    if (schedule.day_start <= schedule.day_stop) {
      return day >= schedule.day_start && day <= schedule.day_stop;
    }
    return day >= schedule.day_start || day <= schedule.day_stop;
  };
  
  // First check: Are we in a current-day schedule window?
  for (const schedule of relevantSchedules) {
    if (!matchesDay(schedule, currentDay)) continue;
    
    const [openHour, openMin] = schedule.time_start.split(':').map(Number);
    const [closeHour, closeMin] = schedule.time_stop.split(':').map(Number);
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;
    
    // Non-overnight schedule (e.g., 11:00-22:00)
    if (closeMinutes > openMinutes) {
      if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
        return { isOpen: true, opensAt: schedule.time_start, closesAt: schedule.time_stop, hasAnySchedules: true };
      }
    } 
    // Overnight schedule that starts today (e.g., 20:00-02:00, we're at 21:00)
    else if (closeMinutes <= openMinutes) {
      if (currentMinutes >= openMinutes) {
        return { isOpen: true, opensAt: schedule.time_start, closesAt: schedule.time_stop, hasAnySchedules: true };
      }
    }
  }
  
  // Second check: Are we in an overnight window from the PREVIOUS day?
  // This handles the case where it's Saturday 1 AM and Friday had 20:00-02:00 schedule
  if (currentMinutes < 6 * 60) { // Only check if we're in early morning hours (before 6 AM)
    for (const schedule of relevantSchedules) {
      if (!matchesDay(schedule, previousDay)) continue;
      
      const [openHour, openMin] = schedule.time_start.split(':').map(Number);
      const [closeHour, closeMin] = schedule.time_stop.split(':').map(Number);
      const openMinutes = openHour * 60 + openMin;
      const closeMinutes = closeHour * 60 + closeMin;
      
      // Check if this is an overnight schedule
      if (closeMinutes <= openMinutes) {
        // We're in the next-day portion of the overnight window
        if (currentMinutes < closeMinutes) {
          return { isOpen: true, opensAt: schedule.time_start, closesAt: schedule.time_stop, hasAnySchedules: true };
        }
      }
    }
  }
  
  // Find next opening time for today
  const todaySchedules = relevantSchedules
    .filter(s => matchesDay(s, currentDay))
    .sort((a, b) => a.time_start.localeCompare(b.time_start));
  
  const futureSchedule = todaySchedules.find(s => {
    const [h, m] = s.time_start.split(':').map(Number);
    return (h * 60 + m) > currentMinutes;
  });
  
  return { 
    isOpen: false, 
    opensAt: futureSchedule?.time_start,
    closesAt: futureSchedule?.time_stop,
    hasAnySchedules: true
  };
}

function formatTimeForDisplay(time: string): string {
  const [hours, mins] = time.split(':').map(Number);
  const date = setMinutes(setHours(new Date(), hours), mins);
  return format(date, 'h:mm a');
}

export function OrderTypeSelector({ className, schedules = [], onDeliveryBlocked }: OrderTypeSelectorProps) {
  const { orderType, setOrderType, getEffectiveDeliveryFee } = useCartStore()
  const effectiveDeliveryFee = getEffectiveDeliveryFee()
  
  const deliveryStatus = isServiceOpen(schedules, 'delivery');
  
  const isDeliveryClosed = deliveryStatus.hasAnySchedules && !deliveryStatus.isOpen;
  
  // Notify parent about delivery blocked status - use effect to avoid render-time state updates
  useEffect(() => {
    if (onDeliveryBlocked) {
      onDeliveryBlocked(orderType === 'delivery' && isDeliveryClosed);
    }
  }, [orderType, isDeliveryClosed, onDeliveryBlocked]);

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
            data-testid="button-order-type-delivery"
          >
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              <span className="font-medium">Delivery</span>
            </div>
            {orderType === 'delivery' && effectiveDeliveryFee > 0 && (
              <span className="text-xs opacity-80">${effectiveDeliveryFee.toFixed(2)} fee</span>
            )}
            {isDeliveryClosed && orderType !== 'delivery' && (
              <span className="text-xs opacity-60">Currently closed</span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="pickup" 
            className="flex flex-col items-center gap-0.5 h-full py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            data-testid="button-order-type-pickup"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span className="font-medium">Pickup</span>
            </div>
            <span className="text-xs opacity-80">No fee</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Delivery closed alert - BLOCKING */}
      {orderType === 'delivery' && isDeliveryClosed && (
        <div className="mt-4 p-4 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-950/50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Delivery is currently closed
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {deliveryStatus.opensAt ? (
                    <>
                      <Clock className="w-3.5 h-3.5 inline-block mr-1" />
                      Opens at {formatTimeForDisplay(deliveryStatus.opensAt)}
                    </>
                  ) : (
                    "The restaurant is not accepting delivery orders right now."
                  )}
                </p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOrderType('pickup')}
                className="border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
                data-testid="button-switch-to-pickup"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Switch to Pickup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Export the helper for use in checkout page
export { isServiceOpen };
