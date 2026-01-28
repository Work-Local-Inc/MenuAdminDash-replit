import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { getRevenueHistory } from '@/lib/supabase/queries'
import { createAdminClient } from '@/lib/supabase/admin'

interface AdminUser {
  id: number
  role_id: number
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request)
    const adminUser = authResult.adminUser as AdminUser
    
    if (!adminUser || typeof adminUser.id !== 'number' || typeof adminUser.role_id !== 'number') {
      return NextResponse.json({ error: 'Invalid admin user' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const timeRange = (searchParams.get('timeRange') || 'daily') as 'daily' | 'weekly' | 'monthly'

    let allowedRestaurantIds: number[] | undefined
    
    // For Restaurant Admins (role_id = 2), filter to only their assigned restaurants
    if (adminUser.role_id === 2) {
      const supabase = createAdminClient()
      
      const { data: assignments, error: assignmentError } = await (supabase as any)
        .schema('menuca_v3')
        .from('admin_user_restaurants')
        .select('restaurant_id')
        .eq('admin_user_id', adminUser.id)
      
      if (assignmentError) {
        console.error('Failed to fetch restaurant assignments:', assignmentError)
        return NextResponse.json({ error: 'Failed to verify restaurant access' }, { status: 500 })
      }
      
      allowedRestaurantIds = (assignments || []).map((a: { restaurant_id: number }) => a.restaurant_id)
    }

    const revenueHistory = await getRevenueHistory(timeRange, allowedRestaurantIds)
    
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
