import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { getRevenueHistory } from '@/lib/supabase/queries'

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const searchParams = request.nextUrl.searchParams
    const timeRange = (searchParams.get('timeRange') || 'daily') as 'daily' | 'weekly' | 'monthly'

    const revenueHistory = await getRevenueHistory(timeRange)
    
    return NextResponse.json(revenueHistory)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch revenue history' },
      { status: 500 }
    )
  }
}
