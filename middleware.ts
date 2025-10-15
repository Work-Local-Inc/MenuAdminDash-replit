import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // TEMPORARILY DISABLED - Just allow all routes
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
}
