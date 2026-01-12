"use client"

import { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useCartStore, PickupTime } from '@/lib/stores/cart-store'
import { Clock, Zap, Calendar, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format, addMinutes, setHours, setMinutes, isBefore, startOfDay, addDays, getDay, isAfter } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface Schedule {
  id: number;
  type: 'delivery' | 'takeout';
  day_start: number;
  day_stop: number;
  time_start: string;
  time_stop: string;
  is_enabled: boolean;
}

interface TimeWindow {
  open: string;
  close: string;
}

interface TimeSlot {
  time: string;
  dateTime: Date;
  displayLabel: string;
}

interface ScheduleTimePickerProps {
  className?: string
  schedules?: Schedule[]
  orderType?: 'delivery' | 'pickup'
  brandedColor?: string
  isServiceClosed?: boolean
  serviceOpensAt?: string
}

const SLOT_INTERVAL_MINUTES = 15;
const MAX_ADVANCE_DAYS = 3;

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
    const roundedMinutes = Math.ceil(minPickupTime.getMinutes() / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES;
    let roundedTime = setMinutes(minPickupTime, roundedMinutes % 60);
    if (roundedMinutes >= 60) {
      roundedTime = addMinutes(setMinutes(roundedTime, 0), roundedMinutes);
    }
    
    if (isAfter(roundedTime, current) && isBefore(roundedTime, closeDateTime)) {
      current = roundedTime;
    } else if (!isBefore(roundedTime, closeDateTime)) {
      return [];
    }
  }
  
  while (isBefore(current, closeDateTime) || current.getTime() === closeDateTime.getTime()) {
    if (!isBefore(current, openDateTime)) {
      const endTime = addMinutes(current, SLOT_INTERVAL_MINUTES);
      const timeStr = format(current, 'HH:mm');
      const displayStart = format(current, 'h:mm a');
      const displayEnd = format(endTime, 'h:mm a');
      
      slots.push({
        time: timeStr,
        dateTime: new Date(current),
        displayLabel: `${displayStart} - ${displayEnd}`,
      });
    }
    current = addMinutes(current, SLOT_INTERVAL_MINUTES);
    
    if (slots.length > 96) break;
  }
  
  return slots;
}

function generateAllTimeSlots(windows: TimeWindow[], dateStr: string): TimeSlot[] {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const isToday = dateStr === todayStr;
  const minPickupTime = isToday ? addMinutes(now, 20) : undefined;
  
  const date = startOfDay(new Date(dateStr + 'T00:00:00'));
  
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

interface DayOption {
  value: string;
  shortLabel: string;
  dateLabel: string;
  fullLabel: string;
  dayOfWeek: number;
  isOpen: boolean;
  isClosed: boolean;
}

function generateDayOptions(schedules: Schedule[], serviceType: 'delivery' | 'takeout'): DayOption[] {
  const options: DayOption[] = [];
  const today = new Date();
  
  for (let i = 0; i < MAX_ADVANCE_DAYS; i++) {
    const date = addDays(today, i);
    const dayOfWeek = getDay(date);
    const value = format(date, 'yyyy-MM-dd');
    
    let shortLabel = format(date, 'EEE');
    if (i === 0) shortLabel = 'Today';
    if (i === 1) shortLabel = 'Tomorrow';
    
    const dateLabel = format(date, 'MMM d');
    const fullLabel = format(date, 'EEEE, MMM d');
    
    const windows = getAllSchedulesForDay(schedules, dayOfWeek, serviceType);
    const isOpen = windows.length > 0;
    
    options.push({ 
      value, 
      shortLabel,
      dateLabel,
      fullLabel,
      dayOfWeek,
      isOpen,
      isClosed: !isOpen
    });
  }
  
  return options;
}

function formatTimeDisplay(time: string) {
  const [hours, mins] = time.split(':').map(Number);
  const date = setMinutes(setHours(new Date(), hours), mins);
  return format(date, 'h:mm a');
}

export function ScheduleTimePicker({ 
  className, 
  schedules = [], 
  orderType = 'pickup', 
  brandedColor, 
  isServiceClosed = false, 
  serviceOpensAt 
}: ScheduleTimePickerProps) {
  const { pickupTime, setPickupTime } = useCartStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const serviceType = orderType === 'pickup' ? 'takeout' : 'delivery';
  const dayOptions = useMemo(() => generateDayOptions(schedules, serviceType), [schedules, serviceType]);
  
  const hasNoSchedules = schedules.length === 0 || !schedules.some(s => s.type === serviceType && s.is_enabled);
  
  const windowsForDay = useMemo(() => {
    const dayOfWeek = getDay(new Date(selectedDate + 'T12:00:00'));
    return getAllSchedulesForDay(schedules, dayOfWeek, serviceType);
  }, [schedules, selectedDate, serviceType]);
  
  const timeSlots = useMemo(() => {
    if (hasNoSchedules) {
      return generateAllTimeSlots([{ open: '11:00', close: '22:00' }], selectedDate);
    }
    if (windowsForDay.length === 0) return [];
    return generateAllTimeSlots(windowsForDay, selectedDate);
  }, [windowsForDay, selectedDate, hasNoSchedules]);
  
  const isCurrentDayClosed = !hasNoSchedules && windowsForDay.length === 0;
  
  useEffect(() => {
    if (isServiceClosed && pickupTime.type === 'asap') {
      setIsModalOpen(true);
      if (timeSlots.length > 0) {
        setSelectedSlot(timeSlots[0]);
      }
    }
  }, [isServiceClosed, timeSlots.length, pickupTime.type]);
  
  useEffect(() => {
    if (pickupTime.type === 'scheduled' && pickupTime.scheduledTime) {
      const scheduledDateTime = new Date(pickupTime.scheduledTime);
      const scheduledDateStr = format(scheduledDateTime, 'yyyy-MM-dd');
      
      const dayOption = dayOptions.find(d => d.value === scheduledDateStr);
      if (dayOption) {
        setSelectedDate(scheduledDateStr);
      }
    }
  }, [pickupTime.scheduledTime, dayOptions]);
  
  useEffect(() => {
    if (isModalOpen && pickupTime.type === 'scheduled' && pickupTime.scheduledTime && timeSlots.length > 0) {
      const scheduledDateTime = new Date(pickupTime.scheduledTime);
      const matchingSlot = timeSlots.find(s => 
        Math.abs(s.dateTime.getTime() - scheduledDateTime.getTime()) < 60000
      );
      if (matchingSlot) {
        setSelectedSlot(matchingSlot);
      } else if (!selectedSlot) {
        setSelectedSlot(timeSlots[0]);
      }
    }
  }, [isModalOpen, timeSlots, pickupTime.scheduledTime]);
  
  const handleAsapClick = () => {
    if (isServiceClosed) return;
    setPickupTime({ type: 'asap' });
  };
  
  const handleScheduleClick = () => {
    setIsModalOpen(true);
    if (timeSlots.length > 0 && !selectedSlot) {
      setSelectedSlot(timeSlots[0]);
    }
  };
  
  const handleDaySelect = (dayValue: string) => {
    setSelectedDate(dayValue);
    setSelectedSlot(null);
  };
  
  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };
  
  const handleConfirm = () => {
    if (selectedSlot) {
      setPickupTime({ type: 'scheduled', scheduledTime: selectedSlot.dateTime.toISOString() });
      setIsModalOpen(false);
    }
  };
  
  const handleCancel = () => {
    setIsModalOpen(false);
    if (pickupTime.type !== 'scheduled') {
      setSelectedSlot(null);
    }
  };
  
  const scrollDays = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 120;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  
  const isDelivery = orderType === 'delivery';
  const timeLabel = isDelivery ? 'When would you like it delivered?' : 'When would you like to pick up?';
  const asapSubtext = isServiceClosed 
    ? (serviceOpensAt ? `Opens at ${formatTimeDisplay(serviceOpensAt)}` : 'Closed now')
    : (isDelivery ? '30-45 min' : '15-25 min');
  const scheduleSubtext = pickupTime.type === 'scheduled' && pickupTime.scheduledTime
    ? format(new Date(pickupTime.scheduledTime), 'EEE, MMM d @ h:mm a')
    : 'Choose delivery time';

  const getActiveStyle = (isActive: boolean) => {
    if (!isActive || !brandedColor) return undefined;
    return { backgroundColor: brandedColor, borderColor: brandedColor, color: 'white' };
  };

  const selectedDayOption = dayOptions.find(d => d.value === selectedDate);

  return (
    <div className={className}>
      <Label className="text-base font-semibold mb-3 block">{timeLabel}</Label>
      
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant={pickupTime.type === 'asap' && !isServiceClosed ? 'default' : 'outline'}
          className={cn(
            "h-auto py-4 flex flex-col items-center gap-1",
            isServiceClosed && "opacity-50 cursor-not-allowed"
          )}
          onClick={handleAsapClick}
          disabled={isServiceClosed}
          style={!isServiceClosed ? getActiveStyle(pickupTime.type === 'asap') : undefined}
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
          onClick={handleScheduleClick}
          style={getActiveStyle(pickupTime.type === 'scheduled')}
          data-testid="button-pickup-scheduled"
        >
          <Calendar className="w-5 h-5" />
          <span className="font-medium">Schedule</span>
          <span className="text-xs opacity-80 text-center">{scheduleSubtext}</span>
        </Button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl font-semibold">
              Schedule {isDelivery ? 'delivery' : 'pickup'}
            </DialogTitle>
            {serviceOpensAt && (
              <p className="text-sm text-muted-foreground mt-1">
                Opens at {formatTimeDisplay(serviceOpensAt)}
              </p>
            )}
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => scrollDays('left')}
                  data-testid="button-scroll-days-left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div 
                  ref={scrollContainerRef}
                  className="flex gap-2 overflow-x-auto scrollbar-hide flex-1"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {dayOptions.map((day) => (
                    <Button
                      key={day.value}
                      variant={selectedDate === day.value ? 'default' : 'outline'}
                      className={cn(
                        "flex flex-col items-center px-4 py-2 min-w-[80px] h-auto shrink-0",
                        day.isClosed && "opacity-50"
                      )}
                      onClick={() => !day.isClosed && handleDaySelect(day.value)}
                      disabled={day.isClosed}
                      style={selectedDate === day.value ? getActiveStyle(true) : undefined}
                      data-testid={`button-day-${day.value}`}
                    >
                      <span className="font-medium text-sm">{day.shortLabel}</span>
                      <span className="text-xs opacity-80">
                        {day.isClosed ? 'Closed' : day.dateLabel}
                      </span>
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => scrollDays('right')}
                  data-testid="button-scroll-days-right"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {isCurrentDayClosed ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                  <p className="text-muted-foreground">
                    Closed on {selectedDayOption?.fullLabel || 'this day'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please select another day
                  </p>
                </div>
              ) : timeSlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    No available times for today
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please select another day
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {timeSlots.map((slot, index) => {
                    const isSelected = selectedSlot?.dateTime.getTime() === slot.dateTime.getTime();
                    return (
                      <button
                        key={index}
                        type="button"
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors",
                          isSelected 
                            ? "border-primary bg-primary/5" 
                            : "border-transparent hover:bg-muted/50"
                        )}
                        onClick={() => handleSlotSelect(slot)}
                        style={isSelected && brandedColor ? { 
                          borderColor: brandedColor, 
                          backgroundColor: `${brandedColor}10` 
                        } : undefined}
                        data-testid={`slot-${slot.time}`}
                      >
                        <span className="text-sm font-medium">{slot.displayLabel}</span>
                        <div 
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            isSelected ? "border-primary" : "border-muted-foreground/30"
                          )}
                          style={isSelected && brandedColor ? { borderColor: brandedColor } : undefined}
                        >
                          {isSelected && (
                            <div 
                              className="w-3 h-3 rounded-full bg-primary"
                              style={brandedColor ? { backgroundColor: brandedColor } : undefined}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          <div className="px-6 py-4 border-t flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              data-testid="button-schedule-cancel"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={!selectedSlot || isCurrentDayClosed}
              style={brandedColor ? { backgroundColor: brandedColor, borderColor: brandedColor } : undefined}
              data-testid="button-schedule-confirm"
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
