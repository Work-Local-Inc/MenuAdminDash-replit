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

    // Query admin_users directly since get_my_admin_info() SQL function doesn't exist
    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('admin_users')
      .select('id, email, first_name, last_name, status, role_id, auth_user_id')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .single()

    if (error) {
      console.error('Error getting admin info:', error)
      console.error('Tried to find admin with auth_user_id:', user.id)
      
      // Try to find by email instead as a fallback
      const { data: emailData, error: emailError } = await supabase
        .schema('menuca_v3')
        .from('admin_users')
        .select('id, email, first_name, last_name, status, role_id, auth_user_id')
        .eq('email', user.email)
        .single()
      
      if (emailError) {
        console.error('Also failed to find by email:', emailError)
        return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
      }
      
      console.log('Found admin by email:', emailData)
      console.log('WARNING: auth_user_id mismatch! DB has:', emailData.auth_user_id, 'but auth user is:', user.id)
      
      // Return the data even if auth_user_id doesn't match
      return NextResponse.json({
        admin_id: emailData.id,
        email: emailData.email,
        first_name: emailData.first_name,
        last_name: emailData.last_name,
        status: emailData.status,
        role_id: emailData.role_id,
        is_active: emailData.status === 'active',
        _warning: 'auth_user_id mismatch'
      })
    }

    if (!data) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Format response to match expected structure
    return NextResponse.json({
      admin_id: data.id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      status: data.status,
      role_id: data.role_id,
      is_active: data.status === 'active'
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
