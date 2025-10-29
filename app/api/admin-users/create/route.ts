import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = await createClient()
    const body = await request.json()

    const { email, first_name, last_name, phone, role_id } = body

    if (!email || !first_name || !last_name || !role_id) {
      return NextResponse.json(
        { error: 'email, first_name, last_name, and role_id are required' },
        { status: 400 }
      )
    }

    // Get current admin's info to check permissions
    // @ts-ignore - RPC function exists in Supabase but not in generated types
    const { data: currentAdmin, error: adminError } = await supabase.rpc('get_my_admin_info')
    
    if (adminError || !currentAdmin || (Array.isArray(currentAdmin) && currentAdmin.length === 0)) {
      return NextResponse.json(
        { error: 'Unable to verify admin permissions' },
        { status: 403 }
      )
    }

    const currentRoleId = (Array.isArray(currentAdmin) ? currentAdmin[0] : currentAdmin).role_id

    // Permission check: determine if current admin can create this role
    const canCreateRole = (currentRole: number, targetRole: number): boolean => {
      // Super Admin (1) can create any role
      if (currentRole === 1) return true
      
      // Manager (2) and Support (3) can only create Staff (6) and Restaurant Manager (5)
      if (currentRole === 2 || currentRole === 3) {
        return targetRole === 5 || targetRole === 6
      }
      
      // Restaurant Manager (5) and Staff (6) cannot create admins
      return false
    }

    if (!canCreateRole(currentRoleId, role_id)) {
      return NextResponse.json(
        { error: 'You do not have permission to create admins with this role' },
        { status: 403 }
      )
    }

    // Create admin user directly with role_id
    const { data: adminUsers, error } = await supabase
      .schema('menuca_v3')
      .from('admin_users')
      .insert({
        email,
        first_name,
        last_name,
        phone: phone || null,
        role_id,
        status: 'pending'
      })
      .select()

    if (error) {
      console.error('Error creating admin user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const data = adminUsers.map(user => ({
      admin_user_id: user.id,
      email: user.email,
      status: user.status,
      role_id: user.role_id
    }))

    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error in POST /api/admin-users/create:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create admin user' },
      { status: 500 }
    )
  }
}
