import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const SUPER_ADMIN_ROLE_ID = 1

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)

    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const { id } = params
    const refundId = parseInt(id)

    if (isNaN(refundId)) {
      return NextResponse.json(
        { error: 'Invalid refund ID' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await (supabase as any)
      .from('order_refunds')
      .select('*')
      .eq('id', refundId)
      .single()

    if (error || !data) {
      console.error('[Refunds] Refund not found:', error)
      return NextResponse.json(
        { error: 'Refund not found' },
        { status: 404 }
      )
    }

    console.log(`[Refunds] Fetched refund #${refundId}`)

    return NextResponse.json(data)
  } catch (error) {
    console.error('[Refunds] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
