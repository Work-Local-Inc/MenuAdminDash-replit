import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      street_address,
      unit,
      city_id,
      postal_code,
      delivery_instructions,
      address_label,
      is_default
    } = body

    if (!street_address || !postal_code) {
      return NextResponse.json(
        { error: 'Missing required fields: street_address, postal_code' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()
    
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = (userData as any).id

    // If this should be default, unset other defaults first
    if (is_default) {
      await adminSupabase
        .from('user_delivery_addresses')
        .update({ is_default: false } as any)
        .eq('user_id', userId)
        .eq('is_default', true)
    }

    const { data, error } = await adminSupabase
      .from('user_delivery_addresses')
      .insert({
        user_id: userId,
        street_address,
        unit: unit || null,
        city_id: city_id || null,
        postal_code: postal_code.toUpperCase().replace(/\s/g, ''),
        delivery_instructions: delivery_instructions || null,
        address_label: address_label || null,
        is_default: is_default || false,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('[Customer Address API] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[Customer Address API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save address' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()
    
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data, error } = await adminSupabase
      .from('user_delivery_addresses')
      .select(`
        *,
        city:cities(name)
      `)
      .eq('user_id', (userData as any).id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Customer Address API] Fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('[Customer Address API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch addresses' },
      { status: 500 }
    )
  }
}
