import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Verify the request is from an authenticated admin user
 * 
 * SECURITY MODEL:
 * - Only admin users should have Supabase Auth accounts
 * - Customers use separate authentication (not Supabase Auth)
 * - This ensures any Supabase authenticated user is an admin
 * - We verify against admin_users table as additional security layer
 * 
 * IMPORTANT: If customers ever use Supabase Auth, this needs updating to:
 * 1. Add supabase_user_id column to admin_users table
 * 2. Match on user.id instead of user.email
 * 3. This prevents email-based privilege escalation
 * 
 * Returns the authenticated user if valid, throws error otherwise
 */
export async function verifyAdminAuth(request: NextRequest) {
  const supabase = await createClient()
  
  // Step 1: Check if user is authenticated via Supabase Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user || !user.email) {
    console.error('[Admin Auth] Not authenticated:', authError)
    throw new Error('Unauthorized - authentication required')
  }
  
  // Step 2: Verify user email exists in admin_users table (using service role to bypass RLS)
  // This ensures the authenticated user is actually an admin
  // Also fetch the user's role and permissions
  const adminSupabase = createAdminClient()
  const { data: adminUser, error: adminError } = await adminSupabase
    .from('admin_users')
    .select(`
      id,
      email,
      first_name,
      last_name,
      role_id,
      role:admin_roles(id, name, permissions, is_system_role)
    `)
    .eq('email', user.email)
    .is('deleted_at', null) // Only active admins
    .single()
  
  if (adminError || !adminUser) {
    console.error('[Admin Auth] User not found in admin_users:', {
      email: user.email,
      error: adminError?.message
    })
    throw new Error('Forbidden - admin access required')
  }
  
  // Ensure user has a role assigned
  if (!adminUser.role) {
    console.error('[Admin Auth] User has no role assigned:', {
      email: user.email,
      adminUserId: adminUser.id
    })
    throw new Error('Forbidden - no role assigned')
  }
  
  // Email match is guaranteed by the .eq('email', user.email) query above
  return { 
    user, 
    adminUser,
    role: adminUser.role,
    permissions: adminUser.role.permissions || {}
  }
}
