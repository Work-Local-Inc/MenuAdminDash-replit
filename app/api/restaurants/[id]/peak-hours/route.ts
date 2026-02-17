import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { PeakHour } from '@/types/supabase-database'
export const dynamic = 'force-dynamic'

const WEEKS_TO_ANALYZE = 4
const MIN_ORDERS_PER_HOUR_SLOT = 3

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const restaurantId = params.id
    
    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    
    const supabase = createAdminClient()
    
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select(`
        id,
        restaurant_locations!inner (
          cities!inner (timezone)
        )
      `)
      .eq('id', parseInt(restaurantId))
      .single()
    
    const timezone = (restaurant as any)?.restaurant_locations?.[0]?.cities?.timezone || 'America/Toronto'
    
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - (WEEKS_TO_ANALYZE * 7))
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('created_at')
      .eq('restaurant_id', parseInt(restaurantId))
      .neq('order_status', 'cancelled')
      .gte('created_at', fourWeeksAgo.toISOString())
    
    if (error) throw error
    
    if (!orders || orders.length < 20) {
      return NextResponse.json({
        peak_hours: [],
        order_count: orders?.length || 0,
        message: 'Not enough order history to detect peak hours (minimum 20 orders needed)',
        hourly_data: [],
        timezone
      })
    }
    
    const hourCounts: Record<string, { day: number; hour: number; count: number }> = {}
    
    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' })
    const hourFormatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false })
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    
    for (const order of orders) {
      const date = new Date(order.created_at)
      const dayStr = dayFormatter.format(date)
      const hourStr = hourFormatter.format(date)
      const day = dayMap[dayStr] ?? 0
      const hour = parseInt(hourStr, 10)
      const key = `${day}-${hour}`
      
      if (!hourCounts[key]) {
        hourCounts[key] = { day, hour, count: 0 }
      }
      hourCounts[key].count++
    }
    
    const hourlyData = Object.values(hourCounts).sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day
      return a.hour - b.hour
    })
    
    const totalOrders = orders.length
    const slotsWithOrders = hourlyData.length
    const averagePerSlot = totalOrders / slotsWithOrders
    
    const peakThreshold = Math.max(
      averagePerSlot * 1.5,
      MIN_ORDERS_PER_HOUR_SLOT
    )
    
    const peakHourCandidates = hourlyData
      .filter(h => h.count >= peakThreshold)
      .sort((a, b) => b.count - a.count)
    
    const peakHours: PeakHour[] = []
    let currentPeak: PeakHour | null = null
    
    const sortedCandidates = [...peakHourCandidates].sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day
      return a.hour - b.hour
    })
    
    for (const candidate of sortedCandidates) {
      if (!currentPeak) {
        currentPeak = { day: candidate.day, start: candidate.hour, end: candidate.hour + 1 }
      } else if (currentPeak.day === candidate.day && currentPeak.end === candidate.hour) {
        currentPeak.end = candidate.hour + 1
      } else {
        peakHours.push(currentPeak)
        currentPeak = { day: candidate.day, start: candidate.hour, end: candidate.hour + 1 }
      }
    }
    
    if (currentPeak) {
      peakHours.push(currentPeak)
    }
    
    return NextResponse.json({
      peak_hours: peakHours,
      order_count: totalOrders,
      average_per_slot: Math.round(averagePerSlot * 10) / 10,
      peak_threshold: Math.round(peakThreshold * 10) / 10,
      hourly_data: hourlyData,
      timezone
    })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[PeakHours GET] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const restaurantId = params.id
    
    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    
    const supabase = createAdminClient()
    const body = await request.json()
    
    const updateData: Record<string, any> = {}
    
    if ('busy_takeout_time_minutes' in body) {
      updateData.busy_takeout_time_minutes = body.busy_takeout_time_minutes
    }
    if ('busy_mode_enabled' in body) {
      updateData.busy_mode_enabled = body.busy_mode_enabled
    }
    if ('peak_hours' in body) {
      updateData.peak_hours = body.peak_hours
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }
    
    const { data, error } = await supabase
      .from('delivery_and_pickup_configs')
      .update(updateData)
      .eq('restaurant_id', parseInt(restaurantId))
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[PeakHours POST] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
