import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractIdFromSlug } from '@/lib/utils/slugify'
import { PeakHour } from '@/types/supabase-database'
export const dynamic = 'force-dynamic'

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

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const adminSupabase = createAdminClient() as any
    const slug = params.slug
    
    const restaurantId = extractIdFromSlug(slug)
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Invalid restaurant identifier' },
        { status: 400 }
      )
    }
    
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
    
    if (error) throw error
    
    if (!config) {
      return NextResponse.json({
        prep_time_minutes: 30,
        is_busy: false,
        mode: 'default'
      })
    }
    
    const normalPrepTime = config.takeout_time_minutes || 30
    const busyPrepTime = config.busy_takeout_time_minutes || normalPrepTime
    const busyModeEnabled = config.busy_mode_enabled || false
    const peakHours = config.peak_hours as PeakHour[] | null
    
    let effectivePrepTime = normalPrepTime
    let isBusy = false
    let mode = 'normal'
    
    if (busyModeEnabled && busyPrepTime > normalPrepTime) {
      // Get timezone directly from restaurant record
      const { data: restaurant } = await adminSupabase
        .schema('menuca_v3')
        .from('restaurants')
        .select('timezone')
        .eq('id', restaurantId)
        .maybeSingle()
      
      const timezone: string | undefined = restaurant?.timezone
      
      const isPeakNow = isCurrentlyPeakHour(peakHours, timezone)
      
      if (isPeakNow) {
        effectivePrepTime = busyPrepTime
        isBusy = true
        mode = 'busy'
      }
    }
    
    return NextResponse.json({
      prep_time_minutes: effectivePrepTime,
      is_busy: isBusy,
      mode,
      normal_prep_time: normalPrepTime,
      busy_prep_time: busyPrepTime,
      busy_mode_enabled: busyModeEnabled
    })
  } catch (error: any) {
    console.error('[PrepTime GET] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch prep time' },
      { status: 500 }
    )
  }
}
