import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import bcrypt from 'bcryptjs'

// GET /api/admin-users/[id] - Get single admin user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes('Unauthorized') ? 401 : 403 }
    )
  }

  const supabase = createAdminClient()
  const { id } = await params

  const { data, error } = await supabase
    .schema('menuca_v3').from('admin_users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching admin user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PATCH /api/admin-users/[id] - Update admin user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes('Unauthorized') ? 401 : 403 }
    )
  }

  const supabase = createAdminClient()
  const { id } = await params
  const body = await request.json()

  const updateData: any = {
    email: body.email,
    first_name: body.first_name,
    last_name: body.last_name,
    mfa_enabled: body.mfa_enabled,
    updated_at: new Date().toISOString(),
  }

  // Only update password if provided - hash server-side for security
  if (body.password) {
    updateData.password_hash = await bcrypt.hash(body.password, 10)
  }

  const { data, error } = await supabase
    .schema('menuca_v3').from('admin_users')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating admin user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE /api/admin-users/[id] - Delete admin user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes('Unauthorized') ? 401 : 403 }
    )
  }

  const supabase = createAdminClient()
  const { id } = await params

  try {
    // First delete related admin_user_restaurants records
    const { error: junctionError } = await supabase
      .schema('menuca_v3').from('admin_user_restaurants')
      .delete()
      .eq('admin_user_id', id)

    if (junctionError) {
      console.error('Error deleting admin_user_restaurants:', junctionError)
      return NextResponse.json(
        { error: 'Failed to delete admin user assignments' },
        { status: 500 }
      )
    }

    // Then delete the admin user
    const { error } = await supabase
      .schema('menuca_v3').from('admin_users')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting admin user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error in DELETE /api/admin-users/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete admin user' },
      { status: 500 }
    )
  }
}
