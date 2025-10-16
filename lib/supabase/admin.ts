import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase-database'

// Admin client with service role key - bypasses RLS for admin operations
// Note: Uses same schema (menuca_v3) as regular client but with elevated permissions
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase URL or Service Role Key')
  }
  
  return createSupabaseClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      db: {
        schema: 'menuca_v3',
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
