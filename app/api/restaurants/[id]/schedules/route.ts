import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const restaurantId = parseInt(params.id)

    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const supabase = createAdminClient() as any
    
    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('restaurant_schedules')
      .select('*')
      .eq('restaurant_id', params.id)
      .order('type', { ascending: true })
      .order('day_start', { ascending: true })
    
    if (error) throw error
    
    return NextResponse.json(data || [])
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const restaurantId = parseInt(params.id)

    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const supabase = createAdminClient() as any
    const body = await request.json()
    
    // Only include columns that exist in the database
    // Note: 'notes' column does NOT exist in production DB
    const insertData: Record<string, any> = {
      restaurant_id: parseInt(params.id),
    }
    
    const allowedColumns = [
      'type',
      'day_start',
      'day_stop', 
      'time_start',
      'time_stop',
      'is_enabled'
    ]
    
    for (const column of allowedColumns) {
      if (column in body) {
        insertData[column] = body[column]
      }
    }
    
    console.log('[Schedules POST] Creating schedule:', insertData)
    
    const { data, error } = await supabase
      .from('restaurant_schedules')
      .insert(insertData)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
