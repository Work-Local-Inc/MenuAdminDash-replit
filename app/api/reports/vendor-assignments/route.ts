import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createClient } from '@/lib/supabase/server'

const SUPER_ADMIN_ROLE_ID = 1

export async function GET(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)

    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get('vendorId')

    const supabase = await createClient()

    let query = (supabase as any)
      .from('vendor_restaurant_assignments')
      .select('*')
      .order('created_at', { ascending: false })

    if (vendorId) {
      query = query.eq('vendor_id', parseInt(vendorId))
    }

    const { data: assignmentsData, error: assignmentsError } = await query

    if (assignmentsError) {
      console.error('[Vendor Assignments] Query error:', assignmentsError)
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      )
    }

    const assignments = assignmentsData || []

    const restaurantIds = [...new Set(assignments.map((a: any) => a.restaurant_id))]

    let restaurantMap = new Map<number, string>()
    if (restaurantIds.length > 0) {
      const { data: restaurantsData } = await supabase
        .from('restaurants')
        .select('id, name')
        .in('id', restaurantIds)

      if (restaurantsData) {
        restaurantMap = new Map(restaurantsData.map((r: any) => [r.id, r.name]))
      }
    }

    const enriched = assignments.map((a: any) => ({
      ...a,
      restaurant_name: restaurantMap.get(a.restaurant_id) || `Restaurant #${a.restaurant_id}`,
    }))

    return NextResponse.json(enriched)
  } catch (error: any) {
    console.error('[Vendor Assignments] Error:', error)
    const status = error.statusCode || 500
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)

    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { vendor_id, restaurant_id, commission_rate, version } = body

    if (!vendor_id || !restaurant_id || commission_rate === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: vendor_id, restaurant_id, commission_rate' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await (supabase as any)
      .from('vendor_restaurant_assignments')
      .insert({
        vendor_id: parseInt(vendor_id),
        restaurant_id: parseInt(restaurant_id),
        commission_rate: parseFloat(commission_rate),
        version: version || 'v1',
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[Vendor Assignments] Insert error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create assignment' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('[Vendor Assignments] Error:', error)
    const status = error.statusCode || 500
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)

    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await (supabase as any)
      .from('vendor_restaurant_assignments')
      .delete()
      .eq('id', parseInt(id))

    if (error) {
      console.error('[Vendor Assignments] Delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete assignment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Vendor Assignments] Error:', error)
    const status = error.statusCode || 500
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
    )
  }
}
