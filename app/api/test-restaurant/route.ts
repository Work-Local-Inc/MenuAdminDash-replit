import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    // Use ADMIN client to bypass RLS
    const supabase = createAdminClient()
    const restaurantId = request.nextUrl.searchParams.get('id') || '73'

    // Check what table is being requested
    const checkTable = request.nextUrl.searchParams.get('check')
    
    if (checkTable === 'users') {
      // Try to query admin_roles table
      const { data: rolesData, error: rolesError, count: rolesCount } = await supabase
        .schema('menuca_v3').from('admin_roles')
        .select('id, name, is_system_role', { count: 'exact' })
        .limit(5)
      
      // Check admin_users with role join
      const { data: adminData, error: adminError } = await supabase
        .schema('menuca_v3').from('admin_users')
        .select('id, email, first_name, last_name, role_id, role:admin_roles(id, name)', { count: 'exact' })
        .limit(3)
      
      return NextResponse.json({
        success: true,
        admin_roles: { 
          exists: !rolesError,
          count: rolesCount, 
          data: rolesData, 
          error: rolesError?.message 
        },
        admin_users: { 
          data: adminData, 
          error: adminError?.message 
        }
      })
    }
    
    // Default: check restaurants
    const { data, error, count } = await supabase
      .schema('menuca_v3').from('restaurants')
      .select('id, name, status', { count: 'exact' })
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      count,
      restaurants: data,
      error: error?.message || null
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
