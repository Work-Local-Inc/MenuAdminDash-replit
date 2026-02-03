import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/supabase-database'
import { extractSubdomain, getRestaurantBySubdomainAsync } from '@/lib/subdomain-mapping'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const rawHostname = request.headers.get('host') || ''
  
  // Strip port for consistent subdomain detection
  const hostname = rawHostname.split(':')[0]
  
  // --- SUBDOMAIN ROUTING ---
  const subdomain = extractSubdomain(hostname)
  
  // Debug logging for production
  console.log(`[Middleware] Host: ${rawHostname}, Hostname: ${hostname}, Subdomain: ${subdomain}, Path: ${pathname}`)
  
  if (subdomain) {
    console.log(`[Middleware] Looking up subdomain: ${subdomain}`)
    // Use async lookup to fetch from database (with caching)
    const mapping = await getRestaurantBySubdomainAsync(subdomain)
    console.log(`[Middleware] Mapping result:`, mapping ? `Found: ${mapping.slug}` : 'NOT FOUND')
    
    if (mapping) {
      // Block admin/login routes on branded subdomains - redirect to main domain
      if (pathname.startsWith('/admin') || pathname === '/login') {
        const url = new URL(`https://orders.menu.ca${pathname}`)
        return NextResponse.redirect(url)
      }
      
      // Rewrite root path to restaurant page
      if (pathname === '/' || pathname === '') {
        const url = request.nextUrl.clone()
        url.pathname = `/r/${mapping.slug}`
        console.log(`[Middleware] Rewriting ${subdomain} to ${url.pathname}`)
        return NextResponse.rewrite(url)
      }
      
      // For other paths (/checkout, /cart, /customer/*)
      // These use cart store (localStorage) for restaurant context
      // Just continue - they will work once customer has visited the restaurant page
      return NextResponse.next()
    } else {
      // Unknown subdomain - log it
      console.log(`[Middleware] Unknown subdomain: ${subdomain}`)
    }
  }
  
  // --- ADMIN/AUTH ROUTES (for main domain only) ---
  if (!pathname.startsWith('/admin') && pathname !== '/login') {
    return NextResponse.next()
  }
  
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: 'menuca_v3'
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

  // If accessing /login with a valid session, redirect to dashboard
  if (request.nextUrl.pathname === '/login' && session) {
    const redirectUrl = new URL('/admin/dashboard', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Match all paths for subdomain routing
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
