import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = await createClient() as any
    const body = await request.json()

    const { admin_user_id, restaurant_ids, action } = body

    if (!admin_user_id || !restaurant_ids || !action) {
      return NextResponse.json(
        { error: 'admin_user_id, restaurant_ids, and action are required' },
        { status: 400 }
      )
    }

    if (!['add', 'remove', 'replace'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be one of: add, remove, replace' },
        { status: 400 }
      )
    }

    // @ts-ignore - RPC function exists in Supabase but not in generated types
    const { data, error } = await supabase.rpc('assign_restaurants_to_admin', {
      p_admin_user_id: admin_user_id,
      p_restaurant_ids: restaurant_ids,
      p_action: action
    })

    if (error) {
      console.error('Error assigning restaurants:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error in POST /api/admin-users/assignments:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to assign restaurants' },
      { status: 500 }
    )
  }
}
