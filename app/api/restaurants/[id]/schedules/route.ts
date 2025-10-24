import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)

    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .schema('menuca_v3')
      .schema('menuca_v3').from('restaurant_schedules')
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
    const supabase = createAdminClient()
    const body = await request.json()
    
    // Remove restaurant_id from body if present, use params.id instead
    const { restaurant_id, ...scheduleData } = body
    
    const { data, error } = await supabase
      .schema('menuca_v3').from('restaurant_schedules')
      .insert({
        ...scheduleData,
        restaurant_id: parseInt(params.id),
      })
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
