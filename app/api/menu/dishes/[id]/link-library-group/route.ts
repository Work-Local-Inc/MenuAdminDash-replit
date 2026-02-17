import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient() as any

    const { id } = await params
    const dishId = parseInt(id, 10)
    if (isNaN(dishId)) {
      return NextResponse.json(
        { error: 'Invalid dish ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { modifier_group_id } = body

    if (!modifier_group_id || typeof modifier_group_id !== 'number') {
      return NextResponse.json(
        { error: 'modifier_group_id is required and must be a number' },
        { status: 400 }
      )
    }

    const { data: existing, error: checkError } = await supabase
      .schema('menuca_v3')
      .from('dish_modifier_groups')
      .select('id')
      .eq('dish_id', dishId)
      .eq('modifier_group_id', modifier_group_id)
      .is('deleted_at', null)
      .maybeSingle()

    if (checkError) throw checkError

    if (existing) {
      return NextResponse.json(
        { error: 'This modifier group is already linked to this dish' },
        { status: 409 }
      )
    }

    const { data: link, error: insertError } = await supabase
      .schema('menuca_v3')
      .from('dish_modifier_groups')
      .insert({
        dish_id: dishId,
        modifier_group_id: modifier_group_id,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json(link)
  } catch (error: any) {
    console.error('[LINK LIBRARY GROUP ERROR]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to link library group' },
      { status: 500 }
    )
  }
}
