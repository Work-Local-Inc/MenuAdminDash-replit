"use client"

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCartStore, PickupTime } from '@/lib/stores/cart-store'
import { Clock, Zap, Calendar, AlertCircle } from 'lucide-react'
import { format, addMinutes, setHours, setMinutes, isBefore, startOfDay, addDays, getDay, isAfter, parseISO } from 'date-fns'

export interface Schedule {
  id: number;
  type: 'delivery' | 'takeout';
  day_start: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  day_stop: number;
  time_start: string; // HH:MM format
  time_stop: string;
  is_enabled: boolean;
}

interface TimeWindow {
  open: string;
  close: string;
}

interface TimeSlot {
  time: string; // HH:mm for display
  dateTime: Date; // Full date for scheduling
}

interface PickupTimeSelectorProps {
  className?: string
  schedules?: Schedule[]
  orderType?: 'delivery' | 'pickup'
  brandedColor?: string
}

function getAllSchedulesForDay(schedules: Schedule[], dayOfWeek: number, serviceType: 'delivery' | 'takeout'): TimeWindow[] {
  const windows: TimeWindow[] = [];
  
  for (const schedule of schedules) {
    if (schedule.type !== serviceType || !schedule.is_enabled) continue;
    
    let matches = false;
    if (schedule.day_start <= schedule.day_stop) {
      matches = dayOfWeek >= schedule.day_start && dayOfWeek <= schedule.day_stop;
    } else {
      matches = dayOfWeek >= schedule.day_start || dayOfWeek <= schedule.day_stop;
    }
    
    if (matches) {
      windows.push({ open: schedule.time_start, close: schedule.time_stop });
    }
  }
  
  windows.sort((a, b) => a.open.localeCompare(b.open));
  
  return windows;
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function isOvernightWindow(window: TimeWindow): boolean {
  const { hours: openHour, minutes: openMin } = parseTime(window.open);
  const { hours: closeHour, minutes: closeMin } = parseTime(window.close);
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;
  return closeMinutes <= openMinutes;
}

function generateTimeSlotsForWindow(window: TimeWindow, date: Date, minPickupTime?: Date): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const { hours: openHour, minutes: openMin } = parseTime(window.open);
  const { hours: closeHour, minutes: closeMin } = parseTime(window.close);
  
  const now = new Date();
  const isToday = format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
  const isOvernight = isOvernightWindow(window);
  
  let openDateTime = setMinutes(setHours(startOfDay(date), openHour), openMin);
  let closeDateTime = setMinutes(setHours(startOfDay(date), closeHour), closeMin);
  
  if (isOvernight) {
    closeDateTime = addDays(closeDateTime, 1);
  }
  
  let current = openDateTime;
  
  if (isToday && minPickupTime) {
    const roundedMinutes = Math.ceil(minPickupTime.getMinutes() / 30) * 30;
    let roundedTime = setMinutes(minPickupTime, roundedMinutes);
    if (roundedTime.getMinutes() >= 60) {
      roundedTime = addMinutes(setMinutes(roundedTime, 0), 60);
    }
    
    if (isAfter(roundedTime, current) && isBefore(roundedTime, closeDateTime)) {
      current = roundedTime;
    } else if (!isBefore(roundedTime, closeDateTime)) {
      return [];
    }
  }
  
  while (isBefore(current, closeDateTime) || current.getTime() === closeDateTime.getTime()) {
    if (!isBefore(current, openDateTime)) {
      slots.push({
        time: format(current, 'HH:mm'),
        dateTime: new Date(current),
      });
    }
    current = addMinutes(current, 30);
    
    if (slots.length > 48) break;
  }
  
  return slots;
}

function generateAllTimeSlots(windows: TimeWindow[], date: Date): TimeSlot[] {
  const now = new Date();
  const isToday = format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
  const minPickupTime = isToday ? addMinutes(now, 20) : undefined;
  
  const allSlots: TimeSlot[] = [];
  const seenTimes = new Set<string>();
  
  for (const window of windows) {
    const windowSlots = generateTimeSlotsForWindow(window, date, minPickupTime);
    for (const slot of windowSlots) {
      const key = slot.dateTime.toISOString();
      if (!seenTimes.has(key)) {
        seenTimes.add(key);
        allSlots.push(slot);
      }
    }
  }
  
  allSlots.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  
  return allSlots;
}

interface DateOption {
  value: string;
  label: string;
  dayOfWeek: number;
  isOpen: boolean;
}

function generateDateOptions(schedules: Schedule[], serviceType: 'delivery' | 'takeout'): DateOption[] {
  const options: DateOption[] = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    const dayOfWeek = getDay(date);
    const value = format(date, 'yyyy-MM-dd');
    let label = format(date, 'EEEE, MMM d');
    if (i === 0) label = 'Today';
    if (i === 1) label = 'Tomorrow';
    
    const windows = getAllSchedulesForDay(schedules, dayOfWeek, serviceType);
    const isOpen = windows.length > 0;
    
    options.push({ 
      value, 
      label: isOpen ? label : `${label} (Closed)`,
      dayOfWeek,
      isOpen 
    });
  }
  
  return options;
}

export function PickupTimeSelector({ className, schedules = [], orderType = 'pickup', brandedColor }: PickupTimeSelectorProps) {
  const { pickupTime, setPickupTime } = useCartStore();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(-1);
  
  const serviceType = orderType === 'pickup' ? 'takeout' : 'delivery';
  const dateOptions = useMemo(() => generateDateOptions(schedules, serviceType), [schedules, serviceType]);
  
  const selectedDayOfWeek = getDay(new Date(selectedDate));
  const windowsForDay = useMemo(() => getAllSchedulesForDay(schedules, selectedDayOfWeek, serviceType), [schedules, selectedDayOfWeek, serviceType]);
  
  const timeSlots = useMemo(() => {
    if (windowsForDay.length === 0) return [];
    return generateAllTimeSlots(windowsForDay, new Date(selectedDate));
  }, [windowsForDay, selectedDate]);
  
  const hasNoSchedules = schedules.length === 0 || !schedules.some(s => s.type === serviceType && s.is_enabled);
  
  const fallbackTimeSlots = useMemo(() => {
    if (!hasNoSchedules) return [];
    return generateAllTimeSlots([{ open: '11:00', close: '22:00' }], new Date(selectedDate));
  }, [hasNoSchedules, selectedDate]);
  
  const availableSlots = hasNoSchedules ? fallbackTimeSlots : timeSlots;
  
  const selectedSlot = selectedSlotIndex >= 0 && selectedSlotIndex < availableSlots.length 
    ? availableSlots[selectedSlotIndex] 
    : null;
  
  // Reset internal state when service type changes or pickupTime is reset to ASAP
  useEffect(() => {
    if (pickupTime.type === 'asap') {
      // Reset to today and clear slot selection when switching to ASAP
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
      setSelectedSlotIndex(-1);
    }
  }, [serviceType, pickupTime.type]);
  
  useEffect(() => {
    if (pickupTime.type === 'scheduled' && pickupTime.scheduledTime) {
      const scheduledDateTime = new Date(pickupTime.scheduledTime);
      const scheduledDateStr = format(scheduledDateTime, 'yyyy-MM-dd');
      const timeStr = format(scheduledDateTime, 'HH:mm');
      const scheduledHour = scheduledDateTime.getHours();
      
      const dayOfWeek = getDay(scheduledDateTime);
      const windowsForScheduledDay = getAllSchedulesForDay(schedules, dayOfWeek, serviceType);
      
      let serviceDateStr = scheduledDateStr;
      
      if (windowsForScheduledDay.length === 0 && scheduledHour < 6) {
        const previousDay = addDays(scheduledDateTime, -1);
        const previousDayOfWeek = getDay(previousDay);
        const previousDayWindows = getAllSchedulesForDay(schedules, previousDayOfWeek, serviceType);
        
        const hasOvernightWindow = previousDayWindows.some(w => isOvernightWindow(w));
        if (hasOvernightWindow) {
          serviceDateStr = format(previousDay, 'yyyy-MM-dd');
        }
      }
      
      setSelectedDate(serviceDateStr);
      
      setTimeout(() => {
        const currentSlots = hasNoSchedules 
          ? generateAllTimeSlots([{ open: '11:00', close: '22:00' }], new Date(serviceDateStr))
          : generateAllTimeSlots(getAllSchedulesForDay(schedules, getDay(new Date(serviceDateStr)), serviceType), new Date(serviceDateStr));
        
        const slotIndex = currentSlots.findIndex(s => 
          Math.abs(s.dateTime.getTime() - scheduledDateTime.getTime()) < 60000
        );
        
        if (slotIndex >= 0) {
          setSelectedSlotIndex(slotIndex);
        }
      }, 0);
    }
  }, [schedules, serviceType, hasNoSchedules]);
  
  const handleTypeChange = (type: 'asap' | 'scheduled') => {
    if (type === 'asap') {
      setPickupTime({ type: 'asap' });
    } else {
      if (availableSlots.length > 0 && selectedSlotIndex < 0) {
        setSelectedSlotIndex(0);
        setPickupTime({ type: 'scheduled', scheduledTime: availableSlots[0].dateTime.toISOString() });
      } else if (selectedSlot) {
        setPickupTime({ type: 'scheduled', scheduledTime: selectedSlot.dateTime.toISOString() });
      }
    }
  };
  
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    const newDayOfWeek = getDay(new Date(date));
    const newWindows = getAllSchedulesForDay(schedules, newDayOfWeek, serviceType);
    
    let newSlots: TimeSlot[] = [];
    if (newWindows.length > 0) {
      newSlots = generateAllTimeSlots(newWindows, new Date(date));
    } else if (hasNoSchedules) {
      newSlots = generateAllTimeSlots([{ open: '11:00', close: '22:00' }], new Date(date));
    }
    
    if (newSlots.length > 0) {
      let newIndex = 0;
      if (selectedSlot) {
        const matchIndex = newSlots.findIndex(s => s.time === selectedSlot.time);
        if (matchIndex >= 0) {
          newIndex = matchIndex;
        }
      }
      setSelectedSlotIndex(newIndex);
      
      if (pickupTime.type === 'scheduled') {
        setPickupTime({ type: 'scheduled', scheduledTime: newSlots[newIndex].dateTime.toISOString() });
      }
    } else {
      setSelectedSlotIndex(-1);
    }
  };
  
  const handleTimeChange = (indexStr: string) => {
    const index = parseInt(indexStr, 10);
    if (index >= 0 && index < availableSlots.length) {
      setSelectedSlotIndex(index);
      setPickupTime({ type: 'scheduled', scheduledTime: availableSlots[index].dateTime.toISOString() });
    }
  };
  
  const formatTimeDisplay = (time: string) => {
    const [hours, mins] = time.split(':').map(Number);
    const date = setMinutes(setHours(new Date(), hours), mins);
    return format(date, 'h:mm a');
  };
  
  const formatSlotDisplay = (slot: TimeSlot) => {
    const displayTime = formatTimeDisplay(slot.time);
    const slotDateStr = format(slot.dateTime, 'yyyy-MM-dd');
    const selectedDateStr = selectedDate;
    
    if (slotDateStr !== selectedDateStr) {
      return `${displayTime} (next day)`;
    }
    return displayTime;
  };
  
  const formatWindowDisplay = (window: TimeWindow) => {
    const closeLabel = isOvernightWindow(window) ? `${formatTimeDisplay(window.close)} (next day)` : formatTimeDisplay(window.close);
    return `${formatTimeDisplay(window.open)} - ${closeLabel}`;
  };
  
  const isCurrentDayClosed = !hasNoSchedules && windowsForDay.length === 0;
  
  // Order type-specific labels
  const isDelivery = orderType === 'delivery';
  const timeLabel = isDelivery ? 'When would you like it delivered?' : 'When would you like to pick up?';
  const asapSubtext = isDelivery ? '30-45 min' : '15-25 min';
  const scheduleSubtext = isDelivery ? 'Choose delivery time' : 'Pick a time';

  // Create branded style for active buttons
  const getActiveStyle = (isActive: boolean) => {
    if (!isActive || !brandedColor) return undefined;
    return { backgroundColor: brandedColor, borderColor: brandedColor, color: 'white' };
  };

  return (
    <div className={className}>
      <Label className="text-base font-semibold mb-3 block">{timeLabel}</Label>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          type="button"
          variant={pickupTime.type === 'asap' ? 'default' : 'outline'}
          className="h-auto py-4 flex flex-col items-center gap-1"
          onClick={() => handleTypeChange('asap')}
          style={getActiveStyle(pickupTime.type === 'asap')}
          data-testid="button-pickup-asap"
        >
          <Zap className="w-5 h-5" />
          <span className="font-medium">ASAP</span>
          <span className="text-xs opacity-80">{asapSubtext}</span>
        </Button>
        
        <Button
          type="button"
          variant={pickupTime.type === 'scheduled' ? 'default' : 'outline'}
          className="h-auto py-4 flex flex-col items-center gap-1"
          onClick={() => handleTypeChange('scheduled')}
          style={getActiveStyle(pickupTime.type === 'scheduled')}
          data-testid="button-pickup-scheduled"
        >
          <Calendar className="w-5 h-5" />
          <span className="font-medium">Schedule</span>
          <span className="text-xs opacity-80">{scheduleSubtext}</span>
        </Button>
      </div>
      
      {pickupTime.type === 'scheduled' && (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pickup-date" className="text-sm">Date</Label>
              <Select value={selectedDate} onValueChange={handleDateChange}>
                <SelectTrigger id="pickup-date" data-testid="select-pickup-date">
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent>
                  {dateOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      disabled={!option.isOpen && !hasNoSchedules}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pickup-time" className="text-sm">Time</Label>
              <Select 
                value={selectedSlotIndex >= 0 ? selectedSlotIndex.toString() : ''} 
                onValueChange={handleTimeChange}
                disabled={isCurrentDayClosed}
              >
                <SelectTrigger id="pickup-time" data-testid="select-pickup-time">
                  <SelectValue placeholder={isCurrentDayClosed ? "Closed" : "Select time"}>
                    {selectedSlot ? formatSlotDisplay(selectedSlot) : (isCurrentDayClosed ? "Closed" : "Select time")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.length === 0 ? (
                    <SelectItem value="-1" disabled>
                      No available times
                    </SelectItem>
                  ) : (
                    availableSlots.map((slot, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {formatSlotDisplay(slot)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isCurrentDayClosed && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>Restaurant is closed on this day. Please select another date.</span>
            </div>
          )}
          
          {availableSlots.length === 0 && !isCurrentDayClosed && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>No more pickup times available today. Please select another date.</span>
            </div>
          )}
          
          {selectedSlot && !isCurrentDayClosed && availableSlots.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                Pickup: {format(selectedSlot.dateTime, 'EEEE, MMM d')} at {formatTimeDisplay(selectedSlot.time)}
              </span>
            </div>
          )}
          
          {windowsForDay.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {windowsForDay.length === 1 ? (
                <span>Operating hours: {formatWindowDisplay(windowsForDay[0])}</span>
              ) : (
                <span>Operating hours: {windowsForDay.map(formatWindowDisplay).join(' & ')}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
