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
      cookies: {
        getAll() {
          // Only access document on the client side
          if (typeof document === 'undefined') return []
          
          return document.cookie.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=')
            return { name, value }
          }).filter(cookie => cookie.name) // Filter out empty cookies
        },
        setAll(cookiesToSet) {
          // Only access document on the client side
          if (typeof document === 'undefined') return
          
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = `${name}=${value}; path=${options?.path || '/'}; max-age=${options?.maxAge || 604800}; ${options?.sameSite ? `samesite=${options.sameSite}` : ''}`
          })
        },
      },
    }
  )
}

// Client for querying public schema tables (admin_users, admin_user_restaurants, etc.)
// Uses 'any' type since Database type is defined for menuca_v3 schema
export function createPublicClient() {
  return createBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: 'public',
      },
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return []
          return document.cookie.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=')
            return { name, value }
          }).filter(cookie => cookie.name)
        },
        setAll(cookiesToSet: any) {
          if (typeof document === 'undefined') return
          cookiesToSet.forEach(({ name, value, options }: any) => {
            document.cookie = `${name}=${value}; path=${options?.path || '/'}; max-age=${options?.maxAge || 604800}; ${options?.sameSite ? `samesite=${options.sameSite}` : ''}`
          })
        },
      },
    }
  )
}
