import { createAdminClient } from '@/lib/supabase/admin'
import { PeakHour } from '@/types/supabase-database'

interface PrepTimeResult {
  prep_time_minutes: number
  is_busy: boolean
  mode: 'normal' | 'busy' | 'default'
}

function isCurrentlyPeakHour(peakHours: PeakHour[] | null, timezone?: string): boolean {
  if (!peakHours || peakHours.length === 0) return false
  
  const now = new Date()
  
  let currentDay: number
  let currentHour: number
  
  if (timezone) {
    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' })
    const hourFormatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false })
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    
    const dayStr = dayFormatter.format(now)
    const hourStr = hourFormatter.format(now)
    currentDay = dayMap[dayStr] ?? now.getDay()
    currentHour = parseInt(hourStr, 10)
  } else {
    currentDay = now.getDay()
    currentHour = now.getHours()
  }
  
  return peakHours.some(peak => 
    peak.day === currentDay && 
    currentHour >= peak.start && 
    currentHour < peak.end
  )
}

export async function getEffectivePrepTime(restaurantId: number): Promise<PrepTimeResult> {
  try {
    const adminSupabase = createAdminClient() as any
    
    const { data: config, error } = await adminSupabase
      .schema('menuca_v3')
      .from('delivery_and_pickup_configs')
      .select(`
        takeout_time_minutes,
        busy_takeout_time_minutes,
        busy_mode_enabled,
        peak_hours
      `)
      .eq('restaurant_id', restaurantId)
      .maybeSingle()
    
    if (error) {
      console.error('[getEffectivePrepTime] Error fetching config:', error)
      return { prep_time_minutes: 30, is_busy: false, mode: 'default' }
    }
    
    if (!config) {
      return { prep_time_minutes: 30, is_busy: false, mode: 'default' }
    }
    
    const normalPrepTime = config.takeout_time_minutes || 30
    const busyPrepTime = config.busy_takeout_time_minutes || normalPrepTime
    const busyModeEnabled = config.busy_mode_enabled || false
    const peakHours = config.peak_hours as PeakHour[] | null
    
    if (busyModeEnabled && busyPrepTime > normalPrepTime) {
      const { data: restaurant } = await adminSupabase
        .schema('menuca_v3')
        .from('restaurants')
        .select('city_id')
        .eq('id', restaurantId)
        .maybeSingle()
      
      let timezone: string | undefined
      if (restaurant?.city_id) {
        const { data: city } = await adminSupabase
          .schema('menuca_v3')
          .from('cities')
          .select('timezone')
          .eq('id', restaurant.city_id)
          .maybeSingle()
        timezone = city?.timezone
      }
      
      const isPeakNow = isCurrentlyPeakHour(peakHours, timezone)
      
      if (isPeakNow) {
        return { prep_time_minutes: busyPrepTime, is_busy: true, mode: 'busy' }
      }
    }
    
    return { prep_time_minutes: normalPrepTime, is_busy: false, mode: 'normal' }
  } catch (error) {
    console.error('[getEffectivePrepTime] Unexpected error:', error)
    return { prep_time_minutes: 30, is_busy: false, mode: 'default' }
  }
}

export function formatPrepTimeRange(prepTimeMinutes: number, orderType: 'pickup' | 'delivery'): string {
  if (orderType === 'pickup') {
    const min = prepTimeMinutes
    const max = prepTimeMinutes + 10
    return `${min}-${max} minutes`
  } else {
    const deliveryBuffer = 15
    const min = prepTimeMinutes + deliveryBuffer
    const max = min + 15
    return `${min}-${max} minutes`
  }
}
