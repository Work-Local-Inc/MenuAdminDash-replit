import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { getUsers } from '@/lib/supabase/queries'

export async function GET(request: NextRequest) {
  try {
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)

    const searchParams = request.nextUrl.searchParams
    const filters = {
      role: searchParams.get('role') || undefined,
      search: searchParams.get('search') || undefined,
    }

    const users = await getUsers(filters)
    
    return NextResponse.json(users)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
