import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: 'menuca_v3',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { session } } = await supabase.auth.getSession()

  // TEMPORARY: Bypass login for demo
  // If accessing /admin routes without a session, redirect to login
  // if (request.nextUrl.pathname.startsWith('/admin') && !session) {
  //   const redirectUrl = new URL('/login', request.url)
  //   return NextResponse.redirect(redirectUrl)
  // }

  // If accessing /login with a valid session, redirect to dashboard
  if (request.nextUrl.pathname === '/login' && session) {
    const redirectUrl = new URL('/admin/dashboard', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
}
