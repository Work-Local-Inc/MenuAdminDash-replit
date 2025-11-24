import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const breakInheritanceSchema = z.object({
  modifier_group_id: z.number().int().positive('Modifier group ID is required'),
})

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()

    const body = await request.json()
    const validatedData = breakInheritanceSchema.parse(body)

    const { data: groupBefore } = await (supabase
      .from('modifier_groups' as any)
      .select('id, course_template_id, is_custom')
      .eq('id', validatedData.modifier_group_id)
      .single() as any)

    if (!groupBefore) {
      return NextResponse.json(
        { error: 'Modifier group not found' },
        { status: 404 }
      )
    }

    if ((groupBefore as any).is_custom || !(groupBefore as any).course_template_id) {
      return NextResponse.json(
        { error: 'Modifier group is already custom or has no template' },
        { status: 400 }
      )
    }

    const { data, error } = await (supabase.rpc as any)('break_modifier_inheritance', {
      p_group_id: validatedData.modifier_group_id,
    })

    if (error) throw error

    const { data: updatedGroup } = await (supabase
      .from('modifier_groups' as any)
      .select(`
        id,
        dish_id,
        course_template_id,
        name,
        is_required,
        min_selections,
        max_selections,
        display_order,
        is_custom,
        dish_modifiers (
          id,
          name,
          price,
          is_included,
          is_default,
          display_order
        )
      `)
      .eq('id', validatedData.modifier_group_id)
      .single() as any)

    return NextResponse.json({
      success: true,
      group: updatedGroup,
    })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to break inheritance' },
      { status: 500 }
    )
  }
}
