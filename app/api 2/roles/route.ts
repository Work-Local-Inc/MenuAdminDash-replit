import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { validatePermissionMatrix, PermissionMatrix } from '@/lib/rbac'

// GET /api/roles - List all roles with optional search
export async function GET(request: NextRequest) {
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
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search') || ''
  const includeSystem = searchParams.get('includeSystem') !== 'false' // default true

  let query = supabase
    .from('admin_roles')
    .select('*', { count: 'exact' })
    .order('is_system_role', { ascending: false }) // System roles first
    .order('name', { ascending: true })

  // Filter out system roles if requested
  if (!includeSystem) {
    query = query.eq('is_system_role', false)
  }

  // Add search filter if provided
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data,
    count
  })
}

// POST /api/roles - Create new role
export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      )
    }

    // Validate permissions structure
    if (body.permissions && !validatePermissionMatrix(body.permissions)) {
      return NextResponse.json(
        { error: 'Invalid permissions format' },
        { status: 400 }
      )
    }

    // Create new role (is_system_role defaults to false for custom roles)
    const { data, error } = await supabase
      .from('admin_roles')
      .insert({
        name: body.name,
        description: body.description || null,
        permissions: body.permissions || {},
        is_system_role: false // Custom roles are never system roles
      } as any)
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
      
      console.error('Error creating role:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error in POST /api/roles:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create role' },
      { status: 500 }
    )
  }
}
