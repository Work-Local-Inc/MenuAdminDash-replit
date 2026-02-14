import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { ensureOAuthProfileForSession } from '@/lib/auth/oauth-profile'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next')

  console.log('[Auth Callback] code:', !!code, 'rawNext:', rawNext, 'full URL:', request.url)

  const safeNext = (rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//'))
    ? rawNext
    : '/customer/account'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          await ensureOAuthProfileForSession({
            authUserId: user.id,
            email: user.email,
            emailVerified: !!user.email_confirmed_at || !!user.confirmed_at,
            firstName: user.user_metadata?.full_name?.split(' ')[0] || user.user_metadata?.first_name,
            lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || user.user_metadata?.last_name,
            phone: user.phone || undefined,
          })
        }
      } catch (profileError) {
        console.error('[Auth Callback] Failed to create OAuth profile:', profileError)
      }
      return NextResponse.redirect(new URL(safeNext, request.url))
    }
  }

  return NextResponse.redirect(new URL('/customer/login', request.url))
}
