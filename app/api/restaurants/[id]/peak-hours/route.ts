import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { PeakHour } from '@/types/supabase-database'

interface OrderHourCount {
  day_of_week: number
  hour_of_day: number
  order_count: number
}

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
    
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
    
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
        hourly_data: []
      })
    }
    
    const hourCounts: Record<string, { day: number; hour: number; count: number }> = {}
    
    for (const order of orders) {
      const date = new Date(order.created_at)
      const day = date.getDay()
      const hour = date.getHours()
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
    const uniqueHours = hourlyData.length
    const averageOrdersPerHour = totalOrders / uniqueHours
    const peakThreshold = averageOrdersPerHour * 1.5
    
    const peakHourCandidates = hourlyData.filter(h => h.count >= peakThreshold)
    
    const peakHours: PeakHour[] = []
    let currentPeak: PeakHour | null = null
    
    for (const candidate of peakHourCandidates) {
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
      average_per_hour: Math.round(averageOrdersPerHour * 10) / 10,
      peak_threshold: Math.round(peakThreshold * 10) / 10,
      hourly_data: hourlyData
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
