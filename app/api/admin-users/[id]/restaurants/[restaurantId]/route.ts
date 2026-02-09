import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
export const dynamic = 'force-dynamic'

// SECURITY: Super Admins only - Restaurant Admins cannot remove restaurant assignments
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; restaurantId: string }> }
) {
  try {
    const authResult = await verifyAdminAuth(request)
    
    // Only Super Admins (role_id = 1) can remove restaurant assignments
    if (authResult.adminUser.role_id !== 1) {
      return NextResponse.json(
        { error: 'Access denied. Super Admin privileges required.' },
        { status: 403 }
      )
    }
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes('Unauthorized') ? 401 : 403 }
    )
  }

  const supabase = createAdminClient() as any
  const { id, restaurantId } = await params

  const { error } = await supabase
    .schema('menuca_v3')
    .from('admin_user_restaurants')
    .delete()
    .eq('admin_user_id', id)
    .eq('restaurant_id', restaurantId)

  if (error) {
    console.error('Error removing restaurant assignment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
