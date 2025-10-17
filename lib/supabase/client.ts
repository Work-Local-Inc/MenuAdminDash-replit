import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase-database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: 'menuca_v3',
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Extended session: 7 days instead of default 1 hour
        storageKey: 'menu-ca-admin-session',
      },
    }
  )
}
