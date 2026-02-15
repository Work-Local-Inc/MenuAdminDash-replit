import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:5000'
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  return `${proto}://${host}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'recovery' | 'signup' | 'email' | 'invite' | null
  const rawNext = searchParams.get('next')
  const baseUrl = getBaseUrl(request)

  console.log('[Auth Confirm] Received request - token_hash:', !!token_hash, 'type:', type, 'next:', rawNext, 'baseUrl:', baseUrl)

  const safeNext = (rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//'))
    ? rawNext
    : '/customer/login'

  if (token_hash && type) {
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

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      console.log('[Auth Confirm] OTP verified successfully, user:', data?.user?.email, '- redirecting to:', safeNext)
      return NextResponse.redirect(new URL(safeNext, baseUrl))
    }

    console.error('[Auth Confirm] OTP verification failed:', error.message, 'code:', error.status)
  }

  let errorRedirect = '/customer/login?error=invalid_link'
  if (rawNext) {
    try {
      const nextUrl = new URL(rawNext, 'http://placeholder')
      const restaurant = nextUrl.searchParams.get('restaurant')
      if (restaurant) {
        errorRedirect = `/r/${restaurant}?error=invalid_link`
      }
    } catch {}
  }

  console.error('[Auth Confirm] Redirecting to:', errorRedirect)
  return NextResponse.redirect(new URL(errorRedirect, baseUrl))
}
