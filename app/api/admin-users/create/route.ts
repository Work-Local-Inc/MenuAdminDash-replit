import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'

// Generate a secure temporary password
function generateTempPassword(): string {
  const length = 16
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Automated Restaurant Owner Creation
async function createRestaurantOwnerAutomated({
  email,
  first_name,
  last_name,
  phone,
  restaurant_ids
}: {
  email: string
  first_name: string
  last_name: string
  phone?: string
  restaurant_ids: number[]
}) {
  try {
    // Create admin client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Generate temporary password
    const tempPassword = generateTempPassword()

    // Step 1: Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        phone
      }
    })

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { error: `Failed to create auth account: ${authError?.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    const authUserId = authData.user.id

    // Step 2: Create admin_users record with role_id = 5 (Restaurant Manager)
    const { data: adminUser, error: adminUserError } = await adminClient
      .schema('menuca_v3')
      .from('admin_users')
      .insert({
        email,
        first_name,
        last_name,
        phone: phone || null,
        auth_user_id: authUserId,
        role_id: 5, // Restaurant Manager
        status: 'active'
      })
      .select()
      .single()

    if (adminUserError) {
      console.error('Error creating admin user record:', adminUserError)
      // Rollback: Delete auth user if admin_users creation fails
      await adminClient.auth.admin.deleteUser(authUserId)
      return NextResponse.json(
        { error: `Failed to create admin record: ${adminUserError.message}` },
        { status: 500 }
      )
    }

    // Step 3: Assign restaurants directly (service role has full access)
    const restaurantAssignments = restaurant_ids.map(rid => ({
      admin_user_id: adminUser.id,
      restaurant_id: rid
    }))

    const { error: assignError } = await adminClient
      .schema('menuca_v3')
      .from('admin_user_restaurants')
      .insert(restaurantAssignments)

    if (assignError) {
      console.error('Error assigning restaurants:', assignError)
      // CRITICAL: Restaurant assignment failure is fatal - rollback everything
      
      // Delete admin_users record
      const { error: deleteAdminError } = await adminClient
        .schema('menuca_v3')
        .from('admin_users')
        .delete()
        .eq('id', adminUser.id)
      
      if (deleteAdminError) {
        console.error('ROLLBACK FAILED: Could not delete admin_users record:', deleteAdminError)
      }
      
      // Delete auth user
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(authUserId)
      
      if (deleteAuthError) {
        console.error('ROLLBACK FAILED: Could not delete auth user:', deleteAuthError)
      }
      
      return NextResponse.json(
        { error: `Failed to assign restaurants: ${assignError.message}. Please try again.` },
        { status: 500 }
      )
    }

    // Step 4: Return success with credentials
    return NextResponse.json([{
      success: true,
      automated: true,
      admin_user_id: adminUser.id,
      email: adminUser.email,
      status: adminUser.status,
      role_id: adminUser.role_id,
      auth_user_id: authUserId,
      temp_password: tempPassword,
      restaurants_assigned: restaurant_ids.length,
      message: `Restaurant Owner created successfully. Credentials: Email: ${email}, Temporary Password: ${tempPassword}`
    }])

  } catch (error: any) {
    console.error('Error in createRestaurantOwnerAutomated:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create restaurant owner' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = await createClient()
    const body = await request.json()

    const { email, first_name, last_name, phone, role_id, restaurant_ids } = body

    if (!email || !first_name || !last_name || !role_id) {
      return NextResponse.json(
        { error: 'email, first_name, last_name, and role_id are required' },
        { status: 400 }
      )
    }

    // For Restaurant Managers, restaurant_ids are required
    if (role_id === 5 && (!restaurant_ids || restaurant_ids.length === 0)) {
      return NextResponse.json(
        { error: 'restaurant_ids are required for Restaurant Manager role' },
        { status: 400 }
      )
    }

    // Get current admin's info to check permissions
    // @ts-ignore - RPC function exists in Supabase but not in generated types
    const { data: currentAdmin, error: adminError } = await supabase.rpc('get_my_admin_info')
    
    if (adminError || !currentAdmin || (Array.isArray(currentAdmin) && (currentAdmin as any[]).length === 0)) {
      return NextResponse.json(
        { error: 'Unable to verify admin permissions' },
        { status: 403 }
      )
    }

    const currentRoleId = ((currentAdmin as any[])[0] || (currentAdmin as any)).role_id as number

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

    // AUTOMATED FLOW: Restaurant Manager (role_id = 5)
    if (role_id === 5) {
      return await createRestaurantOwnerAutomated({
        email,
        first_name,
        last_name,
        phone,
        restaurant_ids
      })
    }

    // MANUAL FLOW: All other roles (Super Admin, Manager, Support, Staff)
    // Use Santiago's create_admin_user_request() RPC function
    // Note: This creates a pending admin user without role_id
    // Role will be assigned in manual SQL UPDATE step after auth account creation
    // @ts-ignore - RPC function exists in Supabase but not in generated types
    const { data: result, error } = await supabase.rpc('create_admin_user_request', {
      p_email: email,
      p_first_name: first_name,
      p_last_name: last_name,
      p_phone: phone || null
    })

    if (error) {
      console.error('Error creating admin user request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add role_id to response for frontend to include in manual UPDATE step
    const data = (Array.isArray(result) ? result : [result]).map((r: any) => ({
      ...r,
      role_id: role_id // Include role_id for manual SQL UPDATE instructions
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
