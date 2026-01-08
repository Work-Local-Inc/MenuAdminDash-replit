'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface DishAvailabilityEditorProps {
  dishId: number
  onChange?: (hiddenDays: number[]) => void
}

const DAYS = [
  { value: 0, label: 'Sun', fullLabel: 'Sunday' },
  { value: 1, label: 'Mon', fullLabel: 'Monday' },
  { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { value: 4, label: 'Thu', fullLabel: 'Thursday' },
  { value: 5, label: 'Fri', fullLabel: 'Friday' },
  { value: 6, label: 'Sat', fullLabel: 'Saturday' },
]

const WEEKDAYS = [1, 2, 3, 4, 5]
const WEEKENDS = [0, 6]

export function DishAvailabilityEditor({ dishId, onChange }: DishAvailabilityEditorProps) {
  const [hiddenDays, setHiddenDays] = useState<number[]>([])
  const [lastSavedDays, setLastSavedDays] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchAvailability() {
      if (!dishId) return
      
      setIsLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase.rpc('get_dish_availability', {
          p_dish_id: dishId
        } as any)

        if (error) {
          console.error('Error fetching dish availability:', error)
          toast({
            title: 'Error',
            description: 'Failed to load availability settings',
            variant: 'destructive',
          })
          return
        }

        const result = data as { success: boolean; hidden_days: number[] } | null
        if (result?.success && Array.isArray(result.hidden_days)) {
          setHiddenDays(result.hidden_days)
          setLastSavedDays(result.hidden_days)
        }
      } catch (err) {
        console.error('Error fetching dish availability:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAvailability()
  }, [dishId, toast])

  const saveAvailability = async (newHiddenDays: number[]) => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('update_dish_availability', {
        p_dish_id: dishId,
        p_hidden_days: newHiddenDays
      } as any)

      if (error) {
        console.error('Error updating dish availability:', error)
        setHiddenDays(lastSavedDays)
        toast({
          title: 'Error',
          description: 'Failed to save - changes reverted',
          variant: 'destructive',
        })
        return false
      }

      const result = data as { success: boolean; message?: string; error?: string } | null
      if (result?.success) {
        setLastSavedDays(newHiddenDays)
        onChange?.(newHiddenDays)
        return true
      } else {
        setHiddenDays(lastSavedDays)
        toast({
          title: 'Error',
          description: result?.error || 'Failed to save - changes reverted',
          variant: 'destructive',
        })
        return false
      }
    } catch (err) {
      console.error('Error updating dish availability:', err)
      setHiddenDays(lastSavedDays)
      toast({
        title: 'Error',
        description: 'Failed to save - changes reverted',
        variant: 'destructive',
      })
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handleDayToggle = async (dayValue: number, makeHidden: boolean) => {
    const newHiddenDays = makeHidden
      ? [...hiddenDays, dayValue].sort((a, b) => a - b)
      : hiddenDays.filter(d => d !== dayValue)
    
    setHiddenDays(newHiddenDays)
    await saveAvailability(newHiddenDays)
  }

  const handleShowAllDays = async () => {
    setHiddenDays([])
    await saveAvailability([])
  }

  const handleShowWeekdaysOnly = async () => {
    const newHiddenDays = WEEKENDS
    setHiddenDays(newHiddenDays)
    await saveAvailability(newHiddenDays)
  }

  const handleShowWeekendsOnly = async () => {
    const newHiddenDays = WEEKDAYS
    setHiddenDays(newHiddenDays)
    await saveAvailability(newHiddenDays)
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading availability...</span>
      </div>
    )
  }

  const visibleDays = DAYS.filter(d => !hiddenDays.includes(d.value))
  const allDaysVisible = hiddenDays.length === 0
  const weekdaysOnly = hiddenDays.length === 2 && WEEKENDS.every(d => hiddenDays.includes(d))
  const weekendsOnly = hiddenDays.length === 5 && WEEKDAYS.every(d => hiddenDays.includes(d))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Day Availability</Label>
        {isSaving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Choose which days this dish is visible to customers
      </p>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={allDaysVisible ? 'default' : 'outline'}
          onClick={handleShowAllDays}
          disabled={isSaving}
          data-testid="button-show-all-days"
        >
          All Days
        </Button>
        <Button
          type="button"
          size="sm"
          variant={weekdaysOnly ? 'default' : 'outline'}
          onClick={handleShowWeekdaysOnly}
          disabled={isSaving}
          data-testid="button-show-weekdays"
        >
          Weekdays Only
        </Button>
        <Button
          type="button"
          size="sm"
          variant={weekendsOnly ? 'default' : 'outline'}
          onClick={handleShowWeekendsOnly}
          disabled={isSaving}
          data-testid="button-show-weekends"
        >
          Weekends Only
        </Button>
      </div>

      {/* Day Checkboxes */}
      <div className="flex flex-wrap gap-2">
        {DAYS.map((day) => {
          const isVisible = !hiddenDays.includes(day.value)
          return (
            <label
              key={day.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                isVisible 
                  ? 'bg-primary/10 border-primary/30 text-primary' 
                  : 'bg-muted/50 border-border text-muted-foreground line-through'
              }`}
              data-testid={`checkbox-day-${day.value}`}
            >
              <Checkbox
                checked={isVisible}
                onCheckedChange={(checked) => handleDayToggle(day.value, !checked)}
                disabled={isSaving}
              />
              <span className="text-sm font-medium">{day.label}</span>
            </label>
          )
        })}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs text-muted-foreground">Visible on:</span>
        {allDaysVisible ? (
          <Badge variant="secondary" className="text-xs">Every day</Badge>
        ) : visibleDays.length === 0 ? (
          <Badge variant="destructive" className="text-xs">Never visible (hidden)</Badge>
        ) : (
          <div className="flex gap-1 flex-wrap">
            {visibleDays.map(day => (
              <Badge key={day.value} variant="secondary" className="text-xs">
                {day.fullLabel}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
