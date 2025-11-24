import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const updateModifierGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  is_required: z.boolean().optional(),
  min_selections: z.number().int().min(0).optional(),
  max_selections: z.number().int().min(0).optional(),
  modifiers: z.array(z.object({
    id: z.number().int().optional(),
    name: z.string().min(1),
    price: z.number().min(0),
    display_order: z.number().int().min(0),
  })).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()

    const modifierGroupId = parseInt(params.id)
    if (isNaN(modifierGroupId)) {
      return NextResponse.json(
        { error: 'Invalid modifier group ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateModifierGroupSchema.parse(body)

    // Update the modifier group
    const { data: updated, error: updateError } = await (supabase
      .schema('menuca_v3')
      .from('course_modifier_templates' as any)
      .update({
        name: validatedData.name,
        is_required: validatedData.is_required,
        min_selections: validatedData.min_selections,
        max_selections: validatedData.max_selections,
      } as any)
      .eq('id', modifierGroupId)
      .select()
      .single() as any)

    if (updateError) throw updateError

    // Handle modifiers update if provided
    if (validatedData.modifiers) {
      // Get existing modifiers
      const { data: existingModifiers } = await (supabase
        .schema('menuca_v3')
        .from('course_template_modifiers' as any)
        .select('id')
        .eq('course_template_id', modifierGroupId) as any)

      const existingIds = (existingModifiers as any[])?.map((m: any) => m.id) || []
      const providedIds = validatedData.modifiers.filter(m => m.id).map(m => m.id!)

      // Delete removed modifiers
      const toDelete = existingIds.filter(id => !providedIds.includes(id))
      if (toDelete.length > 0) {
        await (supabase
          .schema('menuca_v3')
          .from('course_template_modifiers' as any)
          .delete()
          .in('id', toDelete) as any)
      }

      // Update or insert modifiers
      for (const modifier of validatedData.modifiers) {
        if (modifier.id) {
          // Update existing
          await (supabase
            .schema('menuca_v3')
            .from('course_template_modifiers' as any)
            .update({
              name: modifier.name,
              price: modifier.price,
              display_order: modifier.display_order,
            } as any)
            .eq('id', modifier.id) as any)
        } else {
          // Insert new
          await (supabase
            .schema('menuca_v3')
            .from('course_template_modifiers' as any)
            .insert({
              course_template_id: modifierGroupId,
              name: modifier.name,
              price: modifier.price,
              display_order: modifier.display_order,
            } as any) as any)
        }
      }
    }

    return NextResponse.json({ success: true, modifier_group: updated })
  } catch (error: any) {
    console.error('[UPDATE MODIFIER GROUP ERROR]', error)
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
      { error: error.message || 'Failed to update modifier group' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()

    const templateId = parseInt(params.id)
    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      )
    }

    // Fetch existing dish groups that inherit from this template
    const { data: existingGroups } = await (supabase
      .schema('menuca_v3')
      .from('modifier_groups' as any)
      .select('id, is_custom')
      .eq('course_template_id', templateId)
      .is('deleted_at', null) as any)

    // Soft-delete the category template
    const { error: templateError } = await (supabase
      .schema('menuca_v3')
      .from('course_modifier_templates' as any)
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', templateId) as any)

    if (templateError) throw templateError

    // Orphan dish modifier groups (convert inherited groups to custom groups)
    if (existingGroups && (existingGroups as any[]).length > 0) {
      const groupsToOrphan = (existingGroups as any[]).filter((g: any) => !g.is_custom)
      
      if (groupsToOrphan.length > 0) {
        await (supabase
          .schema('menuca_v3')
          .from('modifier_groups' as any)
          .update({ 
            course_template_id: null,
            is_custom: true 
          } as any)
          .in('id', groupsToOrphan.map((g: any) => g.id)) as any)
      }
    }

    return NextResponse.json({
      success: true,
      orphaned_groups: (existingGroups as any[])?.filter((g: any) => !g.is_custom).length || 0,
    })
  } catch (error: any) {
    console.error('[DELETE CATEGORY TEMPLATE ERROR]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete template' },
      { status: 500 }
    )
  }
}
