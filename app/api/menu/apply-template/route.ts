import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const applyTemplateSchema = z.union([
  z.object({
    dish_ids: z.array(z.number().int().positive()).min(1, 'At least one dish ID required'),
    modifier_group_id: z.number().int().positive('Modifier group ID is required'),
  }),
  z.object({
    course_id: z.number().int().positive('Course ID is required'),
    modifier_group_id: z.number().int().positive('Modifier group ID is required'),
  })
])

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient() as any

    const body = await request.json()
    const validatedData = applyTemplateSchema.parse(body)

    let dishIds: number[] = []

    if ('dish_ids' in validatedData) {
      dishIds = validatedData.dish_ids
    } else {
      const { data: dishes, error: dishesError } = await supabase
        .from('dishes')
        .select('id')
        .eq('course_id', validatedData.course_id)
        .is('deleted_at', null)

      if (dishesError) throw dishesError
      dishIds = (dishes as any)?.map((d: any) => d.id) || []
    }

    if (dishIds.length === 0) {
      return NextResponse.json(
        { error: 'No dishes found to apply modifier group to' },
        { status: 400 }
      )
    }

    let successCount = 0
    const errors: string[] = []

    for (const dishId of dishIds) {
      const { data, error } = await (supabase.rpc as any)('apply_template_to_dish', {
        p_dish_id: dishId,
        p_template_id: validatedData.modifier_group_id,
      })

      if (error) {
        errors.push(`Dish ${dishId}: ${error.message}`)
      } else if (data) {
        successCount++
      }
    }

    if (errors.length > 0 && successCount === 0) {
      return NextResponse.json(
        { error: 'Failed to apply modifier group to any dishes', details: errors },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      dishes_updated: successCount,
      total_dishes: dishIds.length,
      errors: errors.length > 0 ? errors : undefined,
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
      { error: error.message || 'Failed to apply modifier group' },
      { status: 500 }
    )
  }
}
