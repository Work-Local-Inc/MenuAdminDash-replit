import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const reorderItemSchema = z.object({
  id: z.number().int().positive(),
  display_order: z.number().int().min(0),
})

const reorderSchema = z.object({
  type: z.enum(['category', 'dish', 'modifier_group', 'modifier', 'template', 'template_modifier']),
  items: z.array(reorderItemSchema).min(1, 'At least one item required'),
})

const TABLE_MAP = {
  category: 'courses',
  dish: 'dishes',
  modifier_group: 'modifier_groups',
  modifier: 'dish_modifiers',
  template: 'course_modifier_templates',
  template_modifier: 'course_template_modifiers',
} as const

export async function PATCH(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()

    const body = await request.json()
    const validatedData = reorderSchema.parse(body)

    const tableName = TABLE_MAP[validatedData.type]

    const items: any = validatedData.items
    const updatePromises: Promise<any>[] = []
    for (let i = 0; i < items.length; i++) {
      // @ts-expect-error - TypeScript doesn't recognize the new table types yet
      const item: any = (items as any)[i]
      const promise = (supabase
        .from(tableName as any)
        .update({ display_order: item.display_order } as any)
        .eq('id', item.id)
        .select()
        .single() as any)
      updatePromises.push(promise)
    }

    const results = await Promise.all(updatePromises)

    const errors = results.filter(r => r.error).map(r => r.error?.message)
    const successfulUpdates = results.filter(r => r.data).map(r => r.data)

    if (errors.length > 0 && successfulUpdates.length === 0) {
      return NextResponse.json(
        { error: 'Failed to reorder items', details: errors },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      updated: successfulUpdates,
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
      { error: error.message || 'Failed to reorder items' },
      { status: 500 }
    )
  }
}
