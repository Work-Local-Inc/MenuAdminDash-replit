import { NextRequest, NextResponse } from 'next/server'
import { getRevenueHistory } from '@/lib/supabase/queries'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeRange = (searchParams.get('timeRange') || 'daily') as 'daily' | 'weekly' | 'monthly'

    const revenueHistory = await getRevenueHistory(timeRange)
    
    return NextResponse.json(revenueHistory)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch revenue history' },
      { status: 500 }
    )
  }
}
