import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createClient } from '@/lib/supabase/server'

const SUPER_ADMIN_ROLE_ID = 1

export async function GET(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)

    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await (supabase as any)
      .from('vendor_configs')
      .select('*')
      .order('vendor_name')

    if (error) {
      console.error('[Vendor Configs] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch vendor configs' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('[Vendor Configs] Error:', error)
    const status = error.statusCode || 500
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
    )
  }
}
