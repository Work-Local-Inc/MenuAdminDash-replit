import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Verify the request is from an authenticated admin user
 * Returns the authenticated user if valid, throws error otherwise
 */
export async function verifyAdminAuth(request: NextRequest) {
  const supabase = await createClient()
  
  // Check if user is authenticated via Supabase Auth (uses anon key with session)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  console.log('[Admin Auth] User check:', {
    hasUser: !!user,
    userEmail: user?.email,
    authError: authError?.message
  })
  
  if (authError || !user) {
    console.error('[Admin Auth] Not authenticated:', authError)
    throw new Error('Unauthorized - authentication required')
  }
  
  // Use admin client (service role) to check admin_users table (bypasses RLS)
  console.log('[Admin Auth] Looking for admin with email:', user.email)
  
  const adminSupabase = createAdminClient()
  const { data: adminUser, error: adminError } = await adminSupabase
    .from('admin_users')
    .select('id, email, first_name, last_name')
    .eq('email', user.email || '')
    .single()
  
  console.log('[Admin Auth] Admin check result:', {
    searchEmail: user.email,
    foundAdmin: adminUser,
    hasAdminUser: !!adminUser,
    adminError: adminError?.message,
    adminErrorCode: adminError?.code
  })
  
  if (adminError || !adminUser) {
    console.error('[Admin Auth] Not an admin:', adminError)
    throw new Error('Forbidden - admin access required')
  }
  
  return { user, adminUser }
}
