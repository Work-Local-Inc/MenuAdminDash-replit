import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { verifyAdminAuth } from '@/lib/auth/admin-check'

// SECURITY: Super Admins only - Restaurant Admins should not view other admins' assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAdminAuth(request)
    
    // Only Super Admins (role_id = 1) can view admin user restaurant assignments
    if (authResult.adminUser.role_id !== 1) {
      return NextResponse.json(
        { error: 'Access denied. Super Admin privileges required.' },
        { status: 403 }
      )
    }
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes('Unauthorized') ? 401 : 403 }
    )
  }

  const supabase = createAdminClient() as any
  const { id } = await params

  const { data: assignments, error: assignError } = await supabase
    .schema('menuca_v3')
    .from('admin_user_restaurants')
    .select('restaurant_id')
    .eq('admin_user_id', id)

  if (assignError) {
    console.error('Error fetching restaurant assignments:', assignError)
    return NextResponse.json({ error: assignError.message }, { status: 500 })
  }

  if (!assignments || assignments.length === 0) {
    return NextResponse.json([])
  }

  const restaurantIds = assignments.map((a: any) => a.restaurant_id)

  const { data: restaurants, error: restError } = await supabase
    .schema('menuca_v3')
    .from('restaurants')
    .select('id, name, slug, status')
    .in('id', restaurantIds)

  if (restError) {
    console.error('Error fetching restaurants:', restError)
    return NextResponse.json({ error: restError.message }, { status: 500 })
  }

  return NextResponse.json(restaurants || [])
}

// SECURITY: Super Admins only - Restaurant Admins cannot assign restaurants
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAdminAuth(request)
    
    // Only Super Admins (role_id = 1) can assign restaurants to admins
    if (authResult.adminUser.role_id !== 1) {
      return NextResponse.json(
        { error: 'Access denied. Super Admin privileges required.' },
        { status: 403 }
      )
    }
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes('Unauthorized') ? 401 : 403 }
    )
  }

  const supabase = createAdminClient() as any
  const { id } = await params
  const body = await request.json()

  if (!body.restaurant_id) {
    return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .schema('menuca_v3')
    .from('admin_user_restaurants')
    .insert({
      admin_user_id: parseInt(id),
      restaurant_id: body.restaurant_id
    })
    .select()
    .single()

  if (error) {
    console.error('Error assigning restaurant:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This restaurant is already assigned to this user' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
