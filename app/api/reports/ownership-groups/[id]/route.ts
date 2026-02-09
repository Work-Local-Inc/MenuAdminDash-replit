import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'

const SUPER_ADMIN_ROLE_ID = 1

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const groupId = parseInt(id)
    const body = await request.json()
    const { group_name, owner_name, restaurant_ids } = body

    if (!group_name || !owner_name) {
      return NextResponse.json({ error: 'group_name and owner_name are required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: group, error: updateError } = await (supabase as any)
      .from('restaurant_ownership_groups')
      .update({ group_name, owner_name })
      .eq('id', groupId)
      .select()
      .single()

    if (updateError) {
      console.error('[Ownership Groups] Update group error:', updateError)
      return NextResponse.json({ error: 'Failed to update group' }, { status: 500 })
    }

    const { error: deleteError } = await (supabase as any)
      .from('restaurant_group_memberships')
      .delete()
      .eq('group_id', groupId)

    if (deleteError) {
      console.error('[Ownership Groups] Delete memberships error:', deleteError)
      return NextResponse.json({ error: 'Failed to update memberships' }, { status: 500 })
    }

    if (restaurant_ids && restaurant_ids.length > 0) {
      const memberships = restaurant_ids.map((rid: number) => ({
        group_id: groupId,
        restaurant_id: rid,
      }))

      const { error: insertError } = await (supabase as any)
        .from('restaurant_group_memberships')
        .insert(memberships)

      if (insertError) {
        console.error('[Ownership Groups] Insert memberships error:', insertError)
        return NextResponse.json({ error: 'Group updated but failed to add restaurants' }, { status: 500 })
      }
    }

    return NextResponse.json(group)
  } catch (error: any) {
    console.error('[Ownership Groups] PUT error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: error.status || 500 })
  }
}
