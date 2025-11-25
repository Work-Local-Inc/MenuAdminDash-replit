import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { getRestaurants } from '@/lib/supabase/queries'

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const searchParams = request.nextUrl.searchParams
    const filters = {
      province: searchParams.get('province') || undefined,
      city: searchParams.get('city') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    }

    const restaurants = await getRestaurants(filters)
    
    return NextResponse.json(restaurants)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch restaurants' },
      { status: 500 }
    )
  }
}
