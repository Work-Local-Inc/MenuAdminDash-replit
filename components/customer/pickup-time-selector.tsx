"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCartStore, PickupTime } from '@/lib/stores/cart-store'
import { Clock, Zap, Calendar } from 'lucide-react'
import { format, addMinutes, setHours, setMinutes, isAfter, isBefore, startOfDay, addDays } from 'date-fns'

interface PickupTimeSelectorProps {
  className?: string
  operatingHours?: {
    open: string  // "11:00"
    close: string // "22:00"
  }
}

function generateTimeSlots(openTime: string, closeTime: string, date: Date): string[] {
  const slots: string[] = []
  const [openHour, openMin] = openTime.split(':').map(Number)
  const [closeHour, closeMin] = closeTime.split(':').map(Number)
  
  const now = new Date()
  const isToday = format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
  
  let current = setMinutes(setHours(startOfDay(date), openHour), openMin)
  const end = setMinutes(setHours(startOfDay(date), closeHour), closeMin)
  
  if (isToday) {
    const minPickupTime = addMinutes(now, 20)
    const roundedMinutes = Math.ceil(minPickupTime.getMinutes() / 30) * 30
    current = setMinutes(setHours(now, minPickupTime.getHours()), roundedMinutes)
    if (current.getMinutes() >= 60) {
      current = setMinutes(setHours(current, current.getHours() + 1), 0)
    }
    if (isBefore(current, setMinutes(setHours(startOfDay(date), openHour), openMin))) {
      current = setMinutes(setHours(startOfDay(date), openHour), openMin)
    }
  }
  
  while (isBefore(current, end) || current.getTime() === end.getTime()) {
    slots.push(format(current, 'HH:mm'))
    current = addMinutes(current, 30)
  }
  
  return slots
}

function generateDateOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const today = new Date()
  
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i)
    const value = format(date, 'yyyy-MM-dd')
    let label = format(date, 'EEEE, MMM d')
    if (i === 0) label = 'Today'
    if (i === 1) label = 'Tomorrow'
    options.push({ value, label })
  }
  
  return options
}

export function PickupTimeSelector({ className, operatingHours }: PickupTimeSelectorProps) {
  const { pickupTime, setPickupTime } = useCartStore()
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [selectedTime, setSelectedTime] = useState<string>('')
  
  const hours = operatingHours || { open: '11:00', close: '22:00' }
  const dateOptions = generateDateOptions()
  const timeSlots = generateTimeSlots(hours.open, hours.close, new Date(selectedDate))
  
  useEffect(() => {
    if (pickupTime.type === 'scheduled' && pickupTime.scheduledTime) {
      const scheduledDate = new Date(pickupTime.scheduledTime)
      setSelectedDate(format(scheduledDate, 'yyyy-MM-dd'))
      setSelectedTime(format(scheduledDate, 'HH:mm'))
    }
  }, [])
  
  const handleTypeChange = (type: 'asap' | 'scheduled') => {
    if (type === 'asap') {
      setPickupTime({ type: 'asap' })
    } else {
      if (timeSlots.length > 0 && !selectedTime) {
        setSelectedTime(timeSlots[0])
      }
      const time = selectedTime || timeSlots[0]
      if (time) {
        const [hours, mins] = time.split(':').map(Number)
        const scheduledDate = setMinutes(setHours(new Date(selectedDate), hours), mins)
        setPickupTime({ type: 'scheduled', scheduledTime: scheduledDate.toISOString() })
      }
    }
  }
  
  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    const newSlots = generateTimeSlots(hours.open, hours.close, new Date(date))
    const newTime = newSlots.includes(selectedTime) ? selectedTime : newSlots[0]
    setSelectedTime(newTime || '')
    
    if (newTime) {
      const [hours, mins] = newTime.split(':').map(Number)
      const scheduledDate = setMinutes(setHours(new Date(date), hours), mins)
      setPickupTime({ type: 'scheduled', scheduledTime: scheduledDate.toISOString() })
    }
  }
  
  const handleTimeChange = (time: string) => {
    setSelectedTime(time)
    const [hours, mins] = time.split(':').map(Number)
    const scheduledDate = setMinutes(setHours(new Date(selectedDate), hours), mins)
    setPickupTime({ type: 'scheduled', scheduledTime: scheduledDate.toISOString() })
  }
  
  const formatTimeDisplay = (time: string) => {
    const [hours, mins] = time.split(':').map(Number)
    const date = setMinutes(setHours(new Date(), hours), mins)
    return format(date, 'h:mm a')
  }

  return (
    <div className={className}>
      <Label className="text-base font-semibold mb-3 block">When would you like to pick up?</Label>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          type="button"
          variant={pickupTime.type === 'asap' ? 'default' : 'outline'}
          className="h-auto py-4 flex flex-col items-center gap-1"
          onClick={() => handleTypeChange('asap')}
          data-testid="button-pickup-asap"
        >
          <Zap className="w-5 h-5" />
          <span className="font-medium">ASAP</span>
          <span className="text-xs opacity-80">15-25 min</span>
        </Button>
        
        <Button
          type="button"
          variant={pickupTime.type === 'scheduled' ? 'default' : 'outline'}
          className="h-auto py-4 flex flex-col items-center gap-1"
          onClick={() => handleTypeChange('scheduled')}
          data-testid="button-pickup-scheduled"
        >
          <Calendar className="w-5 h-5" />
          <span className="font-medium">Schedule</span>
          <span className="text-xs opacity-80">Pick a time</span>
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
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pickup-time" className="text-sm">Time</Label>
              <Select value={selectedTime} onValueChange={handleTimeChange}>
                <SelectTrigger id="pickup-time" data-testid="select-pickup-time">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {formatTimeDisplay(slot)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                Pickup: {dateOptions.find(d => d.value === selectedDate)?.label} at {formatTimeDisplay(selectedTime)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
