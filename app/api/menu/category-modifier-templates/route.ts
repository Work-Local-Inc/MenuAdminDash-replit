import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const modifierSchema = z.object({
  name: z.string().min(1, 'Modifier name is required').max(100),
  price: z.number().min(0, 'Price must be non-negative').optional().default(0),
  is_included: z.boolean().optional().default(false),
})

const createTemplateSchema = z.object({
  course_id: z.number().int().positive('Course ID is required'),
  name: z.string().min(1, 'Template name is required').max(100),
  is_required: z.boolean().optional().default(false),
  min_selections: z.number().int().min(0).optional().default(0),
  max_selections: z.number().int().min(1).optional().default(1),
  modifiers: z.array(modifierSchema).min(1, 'At least one modifier is required'),
})

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()

    const body = await request.json()
    const validatedData = createTemplateSchema.parse(body)

    if (validatedData.min_selections > validatedData.max_selections) {
      return NextResponse.json(
        { error: 'min_selections cannot be greater than max_selections' },
        { status: 400 }
      )
    }

    const { data: existingTemplates } = await (supabase
      .from('course_modifier_templates' as any)
      .select('display_order')
      .eq('course_id', validatedData.course_id)
      .is('deleted_at', null)
      .order('display_order', { ascending: false })
      .limit(1) as any)

    const maxOrder = (existingTemplates as any)?.[0]?.display_order ?? -1
    const displayOrder = maxOrder + 1

    const { data: template, error: templateError } = await (supabase
      .from('course_modifier_templates' as any)
      .insert({
        course_id: validatedData.course_id,
        name: validatedData.name,
        is_required: validatedData.is_required,
        min_selections: validatedData.min_selections,
        max_selections: validatedData.max_selections,
        display_order: displayOrder,
      } as any)
      .select()
      .single() as any)

    if (templateError) throw templateError

    const modifiersToInsert = validatedData.modifiers.map((mod, index) => ({
      template_id: (template as any).id,
      name: mod.name,
      price: mod.price,
      is_included: mod.is_included,
      display_order: index,
    }))

    const { data: modifiers, error: modifiersError } = await (supabase
      .from('course_template_modifiers' as any)
      .insert(modifiersToInsert as any)
      .select() as any)

    if (modifiersError) throw modifiersError

    return NextResponse.json({
      ...(template as any),
      modifiers,
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
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    )
  }
}
