import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = await createClient()
    const body = await request.json()

    const { email, first_name, last_name, phone } = body

    if (!email || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'email, first_name, and last_name are required' },
        { status: 400 }
      )
    }

    // @ts-ignore - RPC function exists in Supabase but not in generated types
    const { data, error } = await supabase.rpc('create_admin_user_request', {
      p_email: email,
      p_first_name: first_name,
      p_last_name: last_name,
      p_phone: phone || null
    })

    if (error) {
      console.error('Error creating admin user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

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
