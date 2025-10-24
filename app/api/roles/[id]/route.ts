import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { validatePermissionMatrix } from '@/lib/rbac'

// GET /api/roles/[id] - Get role details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
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
  const roleId = parseInt(params.id)

  if (isNaN(roleId)) {
    return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('admin_roles')
    .select('*')
    .eq('id', roleId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }
    console.error('Error fetching role:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PATCH /api/roles/[id] - Update role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
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
  const roleId = parseInt(params.id)

  if (isNaN(roleId)) {
    return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 })
  }

  try {
    const body = await request.json()

    // First check if role exists and if it's a system role
    const { data: existingRole, error: fetchError } = await supabase
      .from('admin_roles')
      .select('is_system_role')
      .eq('id', roleId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Role not found' }, { status: 404 })
      }
      throw fetchError
    }

    // Prevent modifying system role name or system status
    if (existingRole.is_system_role) {
      if (body.name || body.is_system_role === false) {
        return NextResponse.json(
          { error: 'Cannot modify name or system status of system roles' },
          { status: 403 }
        )
      }
    }

    // Validate permissions if provided
    if (body.permissions && !validatePermissionMatrix(body.permissions)) {
      return NextResponse.json(
        { error: 'Invalid permissions format' },
        { status: 400 }
      )
    }

    // Build update object (only include provided fields)
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.name !== undefined && !existingRole.is_system_role) {
      updateData.name = body.name
    }
    if (body.description !== undefined) {
      updateData.description = body.description
    }
    if (body.permissions !== undefined) {
      updateData.permissions = body.permissions
    }

    // Update role
    const { data, error } = await supabase
      .from('admin_roles')
      .update(updateData)
      .eq('id', roleId)
      .select()
      .single()

    if (error) {
      // Handle duplicate name error
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A role with this name already exists' },
          { status: 409 }
        )
      }
      
      console.error('Error updating role:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error in PATCH /api/roles/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update role' },
      { status: 500 }
    )
  }
}

// DELETE /api/roles/[id] - Delete role (only if not system role)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
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
  const roleId = parseInt(params.id)

  if (isNaN(roleId)) {
    return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 })
  }

  try {
    // First check if role exists and if it's a system role
    const { data: existingRole, error: fetchError } = await supabase
      .from('admin_roles')
      .select('is_system_role, name')
      .eq('id', roleId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Role not found' }, { status: 404 })
      }
      throw fetchError
    }

    // Prevent deleting system roles
    if (existingRole.is_system_role) {
      return NextResponse.json(
        { error: 'Cannot delete system roles (Super Admin, Restaurant Manager, Staff)' },
        { status: 403 }
      )
    }

    // Check if any admin users are assigned this role
    const { count, error: countError } = await supabase
      .from('admin_user_restaurants')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', roleId)

    if (countError) {
      throw countError
    }

    if (count && count > 0) {
      return NextResponse.json(
        { error: `Cannot delete role. ${count} admin user(s) are currently assigned this role.` },
        { status: 409 }
      )
    }

    // Delete role
    const { error } = await supabase
      .from('admin_roles')
      .delete()
      .eq('id', roleId)

    if (error) {
      console.error('Error deleting role:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { message: `Role "${existingRole.name}" deleted successfully` },
      { status: 200 }
    )
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error in DELETE /api/roles/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete role' },
      { status: 500 }
    )
  }
}
