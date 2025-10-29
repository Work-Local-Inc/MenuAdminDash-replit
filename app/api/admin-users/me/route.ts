import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { getAdminUserByAuthId, getAdminUserByEmail } from '@/lib/db/admin-users'

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

    console.log('[/api/admin-users/me] Looking for admin_user with auth_user_id:', user.id, 'email:', user.email)

    // Try to find by auth_user_id first using direct helper
    const { data: authData, error: authError } = await getAdminUserByAuthId(user.id)
    console.log('[/api/admin-users/me] Auth ID lookup:', authData ? '✓ FOUND' : '✗ NOT FOUND', authError ? `ERROR: ${authError.message}` : '')

    // If not found by auth_user_id, try by email (fallback for testing)
    if (!authData && user.email) {
      console.log('[/api/admin-users/me] Trying email fallback for:', user.email)
      const { data: emailData, error: emailError } = await getAdminUserByEmail(user.email)
      console.log('[/api/admin-users/me] Email lookup:', emailData ? '✓ FOUND' : '✗ NOT FOUND', emailError ? `ERROR: ${emailError.message}` : '')
      
      if (!emailData) {
        console.error('[/api/admin-users/me] FINAL: Admin not found by either method')
        return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
      }
      
      console.log('[/api/admin-users/me] SUCCESS: Found admin by email:', emailData.email, 'ID:', emailData.id, 'Role:', emailData.role_id)
      
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

    console.log('[/api/admin-users/me] SUCCESS: Found admin by auth_user_id:', authData.email, 'ID:', authData.id, 'Role:', authData.role_id)

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
    console.error('[/api/admin-users/me] EXCEPTION:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get admin info' },
      { status: 500 }
    )
  }
}
