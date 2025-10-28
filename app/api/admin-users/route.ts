import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { verifyAdminAuth } from '@/lib/auth/admin-check'

// GET /api/admin-users - List all admin users with optional search
export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    
    const supabase = createAdminClient()
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const role_id = searchParams.get('role_id') || ''
    const status = searchParams.get('status') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .schema('menuca_v3')
      .from('admin_users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone,
        role_id,
        status,
        is_active,
        mfa_enabled,
        last_login_at,
        created_at,
        admin_roles!inner(id, name, description, is_system_role)
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }

    if (role_id) {
      query = query.eq('role_id', parseInt(role_id))
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching admin users:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      count,
      limit,
      offset
    })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error in GET /api/admin-users:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch admin users' },
      { status: 500 }
    )
  }
}
