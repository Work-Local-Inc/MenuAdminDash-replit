import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = await createClient()

    // @ts-ignore - RPC function exists in Supabase but not in generated types
    const { data, error } = await supabase.rpc('get_my_admin_info')

    if (error) {
      console.error('Error getting admin info:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    return NextResponse.json(Array.isArray(data) ? data[0] : data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error in GET /api/admin-users/me:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get admin info' },
      { status: 500 }
    )
  }
}
