"use client"

import { useEffect, useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCartStore, OrderType } from '@/lib/stores/cart-store'
import { Truck, ShoppingBag, AlertCircle, Clock, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { format, getDay, setHours, setMinutes } from 'date-fns'
import { PickupTimeSelector, Schedule } from './pickup-time-selector'

interface OrderTypeSelectorProps {
  className?: string
  schedules?: Schedule[]
  onDeliveryBlocked?: (isBlocked: boolean) => void
  brandedColor?: string
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

export function OrderTypeSelector({ className, schedules = [], onDeliveryBlocked, brandedColor }: OrderTypeSelectorProps) {
  const { orderType, setOrderType, getEffectiveDeliveryFee } = useCartStore()
  const effectiveDeliveryFee = getEffectiveDeliveryFee()
  
  // Memoize service open status to prevent inconsistent results across component
  const deliveryStatus = useMemo(() => isServiceOpen(schedules, 'delivery'), [schedules]);
  const pickupStatus = useMemo(() => isServiceOpen(schedules, 'takeout'), [schedules]);
  
  // Derive closed states from memoized status
  const isDeliveryClosed = deliveryStatus.hasAnySchedules && !deliveryStatus.isOpen;
  const isPickupClosed = pickupStatus.hasAnySchedules && !pickupStatus.isOpen;
  
  // Determine if current service type is closed
  const isCurrentServiceClosed = orderType === 'delivery' ? isDeliveryClosed : isPickupClosed;
  const currentServiceOpensAt = orderType === 'delivery' ? deliveryStatus.opensAt : pickupStatus.opensAt;
  
  // Check if schedules are missing for the current service type
  const hasNoSchedulesForService = orderType === 'delivery' 
    ? !deliveryStatus.hasAnySchedules 
    : !pickupStatus.hasAnySchedules;
  
  // Notify parent about delivery blocked status - use effect to avoid render-time state updates
  useEffect(() => {
    if (onDeliveryBlocked) {
      onDeliveryBlocked(orderType === 'delivery' && isDeliveryClosed);
    }
  }, [orderType, isDeliveryClosed, onDeliveryBlocked]);

  // Create branded style for active tabs
  const getActiveStyle = (isActive: boolean) => {
    if (!isActive) return undefined;
    return brandedColor 
      ? { backgroundColor: brandedColor, borderColor: brandedColor, color: 'white' }
      : undefined;
  };

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
            className={`flex flex-col items-center gap-0.5 h-full py-2 ${!brandedColor ? 'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground' : ''}`}
            style={getActiveStyle(orderType === 'delivery')}
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
            className={`flex flex-col items-center gap-0.5 h-full py-2 ${!brandedColor ? 'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground' : ''}`}
            style={getActiveStyle(orderType === 'pickup')}
            data-testid="button-order-type-pickup"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span className="font-medium">Pickup</span>
            </div>
            <span className="text-xs opacity-80">No fee</span>
            {isPickupClosed && orderType !== 'pickup' && (
              <span className="text-xs opacity-60">Currently closed</span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Alert for closed service - show when current service type is closed */}
      {isCurrentServiceClosed && (
        <Alert className="mt-4" variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {orderType === 'delivery' ? 'Delivery' : 'Pickup'} is currently closed
            {currentServiceOpensAt && `. Opens at ${formatTimeForDisplay(currentServiceOpensAt)}`}
            . You can schedule your order for a later time below.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Alert for missing schedules - inform user that no hours are configured */}
      {hasNoSchedulesForService && (
        <Alert className="mt-4" variant="default">
          <Info className="h-4 w-4" />
          <AlertDescription>
            No {orderType === 'delivery' ? 'delivery' : 'pickup'} hours are configured for this restaurant. 
            Please contact the restaurant directly to confirm availability.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Time Selector - Always show, pass service status so it can disable ASAP when closed */}
      <Separator className="my-4" />
      <PickupTimeSelector 
        schedules={schedules} 
        orderType={orderType}
        brandedColor={brandedColor}
        isServiceClosed={isCurrentServiceClosed}
        serviceOpensAt={currentServiceOpensAt}
      />
    </div>
  )
}

// Export the helper for use in checkout page
export { isServiceOpen };
