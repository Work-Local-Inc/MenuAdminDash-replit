import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { verifyAdminAuth } from '@/lib/auth/admin-check'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; restaurantId: string }> }
) {
  try {
    await verifyAdminAuth(request)
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
