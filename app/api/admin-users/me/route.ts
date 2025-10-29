import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Auth error:', userError)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('Looking for admin_user with auth_user_id:', user.id, 'email:', user.email)

    // Try to find by auth_user_id first
    const { data: authData, error: authError } = await supabase
      .from('admin_users')
      .select('id, email, first_name, last_name, status, role_id, auth_user_id')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    // If not found by auth_user_id, try by email (fallback for testing)
    if (!authData && user.email) {
      console.log('Not found by auth_user_id, trying by email...')
      const { data: emailData, error: emailError } = await supabase
        .from('admin_users')
        .select('id, email, first_name, last_name, status, role_id, auth_user_id')
        .eq('email', user.email)
        .eq('status', 'active')
        .maybeSingle()
      
      if (!emailData) {
        console.error('Admin not found by auth_user_id or email')
        return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
      }
      
      console.log('Found admin by email (auth_user_id will be updated):', emailData.email)
      
      // Format response
      return NextResponse.json({
        admin_id: emailData.id,
        email: emailData.email,
        first_name: emailData.first_name,
        last_name: emailData.last_name,
        status: emailData.status,
        role_id: emailData.role_id,
        is_active: emailData.status === 'active'
      })
    }

    if (!authData) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Format response to match expected structure
    return NextResponse.json({
      admin_id: authData.id,
      email: authData.email,
      first_name: authData.first_name,
      last_name: authData.last_name,
      status: authData.status,
      role_id: authData.role_id,
      is_active: authData.status === 'active'
    })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error in GET /api/admin-users/me:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get admin info' },
      { status: 500 }
    )
  }
}
