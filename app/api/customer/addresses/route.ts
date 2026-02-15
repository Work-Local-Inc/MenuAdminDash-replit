import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as any
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

    const adminSupabase = createAdminClient() as any
    
    // Try to find user by auth_user_id
    let { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('id, email, auth_user_id')
      .eq('auth_user_id', user.id)
      .single()

    // FALLBACK: If not found, try by email or phone
    if (userError || !userData) {
      console.log('[Customer Address API] User not found by auth_user_id, trying email/phone fallback')
      
      if (user.email) {
        const { data: emailData } = await adminSupabase
          .from('users')
          .select('id, email, auth_user_id')
          .eq('email', user.email)
          .maybeSingle()
        if (emailData) userData = emailData
      }

      if (!userData && user.phone) {
        const cleanPhone = user.phone.replace(/\D/g, '')
        const phoneVariants = [user.phone, cleanPhone, '+' + cleanPhone]
        if (cleanPhone.startsWith('1') && cleanPhone.length === 11) {
          phoneVariants.push(cleanPhone.substring(1))
        }
        for (const pv of phoneVariants) {
          const { data: phoneData } = await adminSupabase
            .from('users')
            .select('id, email, auth_user_id')
            .eq('phone', pv)
            .maybeSingle()
          if (phoneData) {
            userData = phoneData
            break
          }
        }
      }

      if (!userData) {
        console.error('[Customer Address API] User not found by any method:', user.email, user.phone)
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Backfill auth_user_id for legacy users
      if (!userData.auth_user_id) {
        console.log('[Customer Address API] Backfilling auth_user_id for user:', userData.id)
        await adminSupabase
          .from('users')
          .update({ auth_user_id: user.id } as any)
          .eq('id', userData.id)
      }
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

    const addressData = {
      user_id: userId,
      street_address,
      unit: unit || null,
      city_id: city_id || null,
      postal_code: postal_code.toUpperCase().replace(/\s/g, ''),
      delivery_instructions: delivery_instructions || null,
      address_label: address_label || null,
      is_default: is_default || false,
    } as any

    let data, error

    if (address_label) {
      const { data: existing } = await adminSupabase
        .from('user_delivery_addresses')
        .select('id')
        .eq('user_id', userId)
        .eq('address_label', address_label)
        .maybeSingle()

      if (existing) {
        const result = await adminSupabase
          .from('user_delivery_addresses')
          .update({
            street_address: addressData.street_address,
            unit: addressData.unit,
            city_id: addressData.city_id,
            postal_code: addressData.postal_code,
            delivery_instructions: addressData.delivery_instructions,
            is_default: addressData.is_default,
          } as any)
          .eq('id', existing.id)
          .select()
          .single()
        data = result.data
        error = result.error
      } else {
        const result = await adminSupabase
          .from('user_delivery_addresses')
          .insert(addressData)
          .select()
          .single()
        data = result.data
        error = result.error
      }
    } else {
      const result = await adminSupabase
        .from('user_delivery_addresses')
        .insert(addressData)
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('[Customer Address API] Save error:', error)
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
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient() as any
    
    // Try to find user by auth_user_id
    let { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('id, email, auth_user_id')
      .eq('auth_user_id', user.id)
      .single()

    // FALLBACK: If not found, try by email or phone
    if (userError || !userData) {
      console.log('[Customer Address API GET] User not found by auth_user_id, trying email/phone fallback')
      
      if (user.email) {
        const { data: emailData } = await adminSupabase
          .from('users')
          .select('id, email, auth_user_id')
          .eq('email', user.email)
          .maybeSingle()
        if (emailData) userData = emailData
      }

      if (!userData && user.phone) {
        const cleanPhone = user.phone.replace(/\D/g, '')
        const phoneVariants = [user.phone, cleanPhone, '+' + cleanPhone]
        if (cleanPhone.startsWith('1') && cleanPhone.length === 11) {
          phoneVariants.push(cleanPhone.substring(1))
        }
        for (const pv of phoneVariants) {
          const { data: phoneData } = await adminSupabase
            .from('users')
            .select('id, email, auth_user_id')
            .eq('phone', pv)
            .maybeSingle()
          if (phoneData) {
            userData = phoneData
            break
          }
        }
      }

      if (!userData) {
        console.error('[Customer Address API GET] User not found by any method:', user.email, user.phone)
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Backfill auth_user_id for legacy users
      if (!userData.auth_user_id) {
        console.log('[Customer Address API GET] Backfilling auth_user_id for user:', userData.id)
        await adminSupabase
          .from('users')
          .update({ auth_user_id: user.id } as any)
          .eq('id', userData.id)
      }
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
