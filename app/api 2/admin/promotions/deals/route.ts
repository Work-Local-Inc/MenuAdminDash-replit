import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { getDealsForAdmin } from '@/lib/api/promotions'

/**
 * GET /api/admin/promotions/deals
 * Get all promotional deals for restaurants the admin manages
 */
export async function GET(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const deals = await getDealsForAdmin(adminUser.id)

    return NextResponse.json({ deals })
  } catch (error) {
    console.error('[GET /api/admin/promotions/deals]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch deals' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  }
}
