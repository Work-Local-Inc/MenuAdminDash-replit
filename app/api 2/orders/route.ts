import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { getOrders } from '@/lib/supabase/queries'

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const searchParams = request.nextUrl.searchParams
    const filters = {
      restaurant_id: searchParams.get('restaurant_id') || undefined,
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    }

    const orders = await getOrders(filters)
    
    return NextResponse.json(orders)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
