import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  
  try {
    // Try to insert roles directly - if table doesn't exist, it will fail
    // This is safer than running DDL from application code

    // Step 1: Insert default roles
    const { data: insertedRoles, error: insertRolesError } = await supabase
      .schema('menuca_v3').from('admin_roles')
      .insert([
        {
          name: 'Super Admin',
          description: 'Full platform access to all features and restaurants',
          permissions: {
            restaurants: { create: true, edit: true, delete: true, view: true },
            users: { create: true, edit: true, delete: true, view: true },
            orders: { manage: true, view: true },
            reports: { view: true },
            settings: { manage: true },
            menu: { edit: true },
            coupons: { create: true, edit: true, delete: true, view: true },
            franchise: { create: true, edit: true, delete: true, view: true },
            blacklist: { create: true, edit: true, delete: true, view: true },
            accounting: { manage: true, view: true }
          },
          is_system_role: true
        },
        {
          name: 'Restaurant Manager',
          description: 'Manage assigned restaurants and their menus/orders',
          permissions: {
            restaurants: { edit: true, view: true },
            orders: { manage: true, view: true },
            menu: { edit: true },
            reports: { view: true },
            coupons: { create: true, edit: true, view: true }
          },
          is_system_role: true
        },
        {
          name: 'Staff',
          description: 'View-only access to orders and reports',
          permissions: {
            restaurants: { view: true },
            orders: { view: true },
            reports: { view: true }
          },
          is_system_role: true
        }
      ])
      .select()

    if (insertRolesError) {
      // Table doesn't exist - return instructions
      if (insertRolesError.code === '42P01' || insertRolesError.message?.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          table_exists: false,
          message: 'admin_roles table does not exist in database',
          error: insertRolesError.message,
          instructions: 'You need to run the SQL migration in Supabase SQL Editor first'
        }, { status: 400 })
      }
      
      // Duplicate key error is OK - roles already exist
      if (insertRolesError.code !== '23505') {
        throw insertRolesError
      }
    }

    // Step 2: Assign Super Admin role to all existing admin users
    const { data: superAdminRole } = await supabase
      .schema('menuca_v3').from('admin_roles')
      .select('id')
      .eq('name', 'Super Admin')
      .single()

    if (superAdminRole) {
      const { error: updateError } = await supabase
        .schema('menuca_v3').from('admin_users')
        .update({ role_id: superAdminRole.id })
        .is('role_id', null)
      
      if (updateError) {
        console.error('Error assigning roles:', updateError)
      }
    }

    // Verify the migration
    const { count: rolesCount } = await supabase
      .schema('menuca_v3').from('admin_roles')
      .select('*', { count: 'exact', head: true })

    const { count: usersWithRoles } = await supabase
      .schema('menuca_v3').from('admin_users')
      .select('*', { count: 'exact', head: true })
      .not('role_id', 'is', null)

    return NextResponse.json({
      success: true,
      message: 'Admin roles migration completed successfully',
      roles_created: rolesCount,
      users_with_roles: usersWithRoles,
      table_exists: true
    })

  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error
    }, { status: 500 })
  }
}
