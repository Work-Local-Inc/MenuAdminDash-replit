import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createClient } from '@/lib/supabase/server'

const SUPER_ADMIN_ROLE_ID = 1

export async function GET(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    const supabase = await createClient()

    const { data: groups, error: groupsError } = await (supabase as any)
      .from('restaurant_ownership_groups')
      .select('id, group_name, owner_name')
      .order('group_name')

    if (groupsError) {
      console.error('[Ownership Groups] Groups query error:', groupsError)
      return NextResponse.json({ error: 'Failed to fetch ownership groups' }, { status: 500 })
    }

    const { data: memberships, error: membershipsError } = await (supabase as any)
      .from('restaurant_group_memberships')
      .select('group_id, restaurant_id')

    if (membershipsError) {
      console.error('[Ownership Groups] Memberships query error:', membershipsError)
      return NextResponse.json({ error: 'Failed to fetch memberships' }, { status: 500 })
    }

    const restaurantIds = [...new Set((memberships || []).map((m: any) => m.restaurant_id))]
    let restaurantMap = new Map<number, string>()

    if (restaurantIds.length > 0) {
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id, name')
        .in('id', restaurantIds)

      if (restaurants) {
        for (const r of restaurants) {
          restaurantMap.set(r.id, r.name)
        }
      }
    }

    const result = (groups || []).map((g: any) => {
      const groupMemberships = (memberships || []).filter((m: any) => m.group_id === g.id)
      return {
        id: g.id,
        group_name: g.group_name,
        owner_name: g.owner_name,
        restaurants: groupMemberships.map((m: any) => ({
          restaurant_id: m.restaurant_id,
          restaurant_name: restaurantMap.get(m.restaurant_id) || `Restaurant #${m.restaurant_id}`,
        })),
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[Ownership Groups] GET error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: error.status || 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { group_name, owner_name, restaurant_ids } = body

    if (!group_name || !owner_name) {
      return NextResponse.json({ error: 'group_name and owner_name are required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: group, error: groupError } = await (supabase as any)
      .from('restaurant_ownership_groups')
      .insert({ group_name, owner_name })
      .select()
      .single()

    if (groupError) {
      console.error('[Ownership Groups] Create group error:', groupError)
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
    }

    if (restaurant_ids && restaurant_ids.length > 0) {
      const memberships = restaurant_ids.map((rid: number) => ({
        group_id: group.id,
        restaurant_id: rid,
      }))

      const { error: membershipError } = await (supabase as any)
        .from('restaurant_group_memberships')
        .insert(memberships)

      if (membershipError) {
        console.error('[Ownership Groups] Create memberships error:', membershipError)
        return NextResponse.json({ error: 'Group created but failed to add restaurants' }, { status: 500 })
      }
    }

    return NextResponse.json(group, { status: 201 })
  } catch (error: any) {
    console.error('[Ownership Groups] POST error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: error.status || 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await (supabase as any)
      .from('restaurant_ownership_groups')
      .delete()
      .eq('id', parseInt(id))

    if (error) {
      console.error('[Ownership Groups] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Ownership Groups] DELETE error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: error.status || 500 })
  }
}
