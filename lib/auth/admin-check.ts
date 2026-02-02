import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { User } from '@supabase/supabase-js'

// Type for the admin user returned by verifyAdminAuth
export interface AdminUser {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  role_id: number
}

// Return type for verifyAdminAuth
export interface AdminAuthResult {
  user: User
  adminUser: AdminUser
}

/**
 * Verify the request is from an authenticated admin user
 * 
 * SECURITY MODEL:
 * - Only admin users should have Supabase Auth accounts
 * - Customers use separate authentication (not Supabase Auth)
 * - This ensures any Supabase authenticated user is an admin
 * - We verify against admin_users table using auth_user_id (more secure than email)
 * 
 * Returns the authenticated user if valid, throws error otherwise
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  const supabase = await createClient()
  
  // Step 1: Check if user is authenticated via Supabase Auth
  console.log('[Admin Auth] Calling supabase.auth.getUser()...')
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.error('[Admin Auth] Not authenticated:', authError?.message || 'No user found')
    console.error('[Admin Auth] Full error:', authError)
    throw new UnauthorizedError('Unauthorized - authentication required')
  }
  
  console.log(`[Admin Auth] Authenticated Supabase user: ${user.email} (${user.id})`)
  
  // Step 2: Verify user auth_user_id exists in admin_users table (using service role to bypass RLS)
  // This ensures the authenticated user is actually an admin
  // Using auth_user_id instead of email for better security
  const adminSupabase = createAdminClient()
  
  // Try to find by auth_user_id first (preferred, more secure)
  let adminUser = null
  let adminError = null
  
  const { data: authIdMatch, error: authIdError } = await adminSupabase
    .from('admin_users')
    .select('id, email, first_name, last_name, role_id')
    .eq('auth_user_id', user.id)
    .is('deleted_at', null)
    .single()
  
  if (authIdMatch) {
    adminUser = authIdMatch
  } else if (user.email) {
    // Fallback to email match for backwards compatibility with existing admins
    // who may not have auth_user_id set yet
    const { data: emailMatch, error: emailError } = await adminSupabase
      .from('admin_users')
      .select('id, email, first_name, last_name, role_id')
      .eq('email', user.email)
      .is('deleted_at', null)
      .single()
    
    adminUser = emailMatch
    adminError = emailError
  }
  
  if (!adminUser) {
    console.error('[Admin Auth] User not found in admin_users:', {
      auth_user_id: user.id,
      email: user.email,
      error: adminError?.message || authIdError?.message
    })
    throw new ForbiddenError('Forbidden - admin access required')
  }
  
  return { 
    user, 
    adminUser
  }
}
