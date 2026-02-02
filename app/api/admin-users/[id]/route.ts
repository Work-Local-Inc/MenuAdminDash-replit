import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { verifyAdminAuth } from '@/lib/auth/admin-check'

// GET /api/admin-users/[id] - Get single admin user
// SECURITY: Super Admins can view any admin; Restaurant Admins can only view themselves
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let authResult
  try {
    authResult = await verifyAdminAuth(request)
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
  const isSuperAdmin = authResult.adminUser.role_id === 1
  const isOwnProfile = authResult.adminUser.id.toString() === id

  console.log(`[GET /api/admin-users/${id}] Requesting user: ID=${authResult.adminUser.id}, Role=${authResult.adminUser.role_id}, Email=${authResult.adminUser.email}`)
  console.log(`[GET /api/admin-users/${id}] isSuperAdmin=${isSuperAdmin}, isOwnProfile=${isOwnProfile}`)

  // Restaurant Admins can only view their own profile
  if (!isSuperAdmin && !isOwnProfile) {
    console.log(`[GET /api/admin-users/${id}] ACCESS DENIED: User ${authResult.adminUser.id} cannot view user ${id}`)
    return NextResponse.json(
      { error: 'Access denied. You can only view your own profile.' },
      { status: 403 }
    )
  }

  const { data, error } = await supabase
    .schema('menuca_v3')
    .from('admin_users')
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
// SECURITY: Super Admins can update any admin; Restaurant Admins can only update themselves
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let requestingAdminRoleId: number | null = null
  let requestingAdminId: number | null = null
  
  try {
    const authResult = await verifyAdminAuth(request)
    requestingAdminRoleId = authResult.adminUser.role_id
    requestingAdminId = authResult.adminUser.id
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

  const isSuperAdmin = requestingAdminRoleId === 1
  const isOwnProfile = requestingAdminId?.toString() === id

  // SECURITY: Restaurant Admins can only update their own profile
  if (!isSuperAdmin && !isOwnProfile) {
    console.warn(`[SECURITY] Non-Super Admin (ID: ${requestingAdminId}) attempted to update another user ${id}`)
    return NextResponse.json(
      { error: 'Access denied. You can only update your own profile.' },
      { status: 403 }
    )
  }

  // SECURITY: Only Super Admins can change role_id or status
  if (!isSuperAdmin && (body.role_id !== undefined || body.status !== undefined)) {
    console.warn(`[SECURITY] Non-Super Admin (ID: ${requestingAdminId}) attempted to change role/status for user ${id}`)
    return NextResponse.json(
      { error: 'Only Super Admins can change user roles and status' },
      { status: 403 }
    )
  }

  // First get the target user to find their auth_user_id
  const { data: currentUser, error: fetchError } = await supabase
    .schema('menuca_v3')
    .from('admin_users')
    .select('auth_user_id, role_id, status')
    .eq('id', id)
    .single()

  if (fetchError) {
    console.error('Error fetching admin user:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // If password is being updated, use Supabase Auth admin API
  if (body.password && currentUser?.auth_user_id) {
    const { error: authError } = await supabase.auth.admin.updateUserById(
      currentUser.auth_user_id,
      { password: body.password }
    )
    if (authError) {
      console.error('Error updating password:', authError)
      return NextResponse.json({ error: `Failed to update password: ${authError.message}` }, { status: 500 })
    }
  }

  // Build update data - only include role_id/status if Super Admin
  const updateData: Record<string, any> = {
    email: body.email,
    first_name: body.first_name,
    last_name: body.last_name,
    updated_at: new Date().toISOString(),
  }

  // Only Super Admins can update role and status
  if (isSuperAdmin) {
    if (body.role_id !== undefined) updateData.role_id = body.role_id
    if (body.status !== undefined) updateData.status = body.status
  }

  const { data, error } = await supabase
    .schema('menuca_v3')
    .from('admin_users')
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

// DELETE /api/admin-users/[id] - Delete admin user (Super Admins only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let requestingAdminRoleId: number | null = null
  
  try {
    const authResult = await verifyAdminAuth(request)
    requestingAdminRoleId = authResult.adminUser.role_id
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes('Unauthorized') ? 401 : 403 }
    )
  }

  // SECURITY: Only Super Admins can delete users
  if (requestingAdminRoleId !== 1) {
    console.warn(`[SECURITY] Non-Super Admin attempted to delete user`)
    return NextResponse.json(
      { error: 'Only Super Admins can delete users' },
      { status: 403 }
    )
  }

  const supabase = createAdminClient() as any
  const { id } = await params

  try {
    // First delete related admin_user_restaurants records
    const { error: junctionError } = await supabase
      .schema('menuca_v3')
      .from('admin_user_restaurants')
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
      .schema('menuca_v3')
      .from('admin_users')
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
