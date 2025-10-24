import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyAdminAuthWithPermission } from '@/lib/auth/permission-check'
import bcrypt from 'bcryptjs'

// GET /api/admin-users - List all admin users with optional search
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
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
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search') || ''
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('admin_users')
    .select(`
      *,
      role:admin_roles(id, name, is_system_role)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Add search filter if provided
  if (search) {
    query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
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
}

// POST /api/admin-users - Create new admin user  
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication and check for 'users:create' permission
    await verifyAdminAuthWithPermission(request, 'users', 'create')
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
  
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.email || !body.password || !body.role_id) {
      return NextResponse.json(
        { error: 'Email, password, and role are required' },
        { status: 400 }
      )
    }

    // Hash password server-side for security
    const passwordHash = await bcrypt.hash(body.password, 10)

    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        email: body.email,
        first_name: body.first_name || null,
        last_name: body.last_name || null,
        password_hash: passwordHash,
        role_id: body.role_id,
        mfa_enabled: body.mfa_enabled || false,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating admin user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error in POST /api/admin-users:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create admin user' },
      { status: 500 }
    )
  }
}
