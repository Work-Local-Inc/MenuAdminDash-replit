import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase-database'

// Admin client with service role key - bypasses RLS for admin operations
// global.fetch options ensure Next.js App Router doesn't cache Supabase responses
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'menuca_v3' },
      global: {
        fetch: (url: RequestInfo | URL, init?: RequestInit) => {
          return fetch(url, { ...init, cache: 'no-store' })
        }
      }
    }
  )
}
