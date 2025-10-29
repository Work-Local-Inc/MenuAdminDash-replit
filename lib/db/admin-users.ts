// Direct Supabase REST API calls for admin_users table
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function getAdminUserByAuthId(authUserId: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'menuca_v3' }
    }
  )

  const { data, error } = await supabase
    .schema('menuca_v3')
    .from('admin_users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .eq('status', 'active')
    .maybeSingle()

  return { data, error }
}

export async function getAdminUserByEmail(email: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'menuca_v3' }
    }
  )

  const { data, error } = await supabase
    .schema('menuca_v3')
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .eq('status', 'active')
    .maybeSingle()

  return { data, error }
}
