import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
export const dynamic = 'force-dynamic'

const modifierSchema = z.object({
  name: z.string().min(1, 'Modifier name is required').max(100),
  price: z.number().min(0, 'Price must be non-negative').optional().default(0),
  is_included: z.boolean().optional().default(false),
})

const createGlobalGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
  is_required: z.boolean().optional().default(false),
  min_selections: z.number().int().min(0).optional().default(0),
  max_selections: z.number().int().min(1).optional().default(1),
  modifiers: z.array(modifierSchema).min(1, 'At least one modifier is required'),
})

const updateGlobalGroupSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1, 'Group name is required').max(100).optional(),
  is_required: z.boolean().optional(),
  min_selections: z.number().int().min(0).optional(),
  max_selections: z.number().int().min(1).optional(),
  modifiers: z.array(modifierSchema).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request) as { adminUser: any }
    const supabase = createAdminClient() as any
    
    // Get restaurant_id from query params - REQUIRED for multi-tenancy
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      )
    }

    const restaurantIdNum = parseInt(restaurantId, 10)
    console.log('[MODIFIER GROUPS] Fetching groups for restaurant:', restaurantIdNum)
    
    // Step 1: Get all modifier groups for this restaurant directly
    // modifier_groups table has: id, restaurant_id, name_en, name_fr, category
    const { data: modifierGroups, error: groupsError } = await supabase
      .schema('menuca_v3')
      .from('modifier_groups')
      .select('id, restaurant_id, name_en, name_fr, category, created_at')
      .eq('restaurant_id', restaurantIdNum)
      .is('deleted_at', null)
    
    if (groupsError) throw groupsError
    
    if (!modifierGroups || modifierGroups.length === 0) {
      console.log('[MODIFIER GROUPS API] No modifier groups found for restaurant', restaurantIdNum)
      return NextResponse.json([])
    }
    
    const groupIds = modifierGroups.map((g: any) => g.id)
    console.log('[MODIFIER GROUPS] Found modifier groups:', groupIds.length, 'IDs:', groupIds)
    
    // Step 2: Get all modifiers for these groups
    // modifiers table has: id, modifier_group_id, name_en, name_fr, is_active, display_order
    const { data: modifiers, error: modifiersError } = await supabase
      .schema('menuca_v3')
      .from('modifiers')
      .select('id, modifier_group_id, name_en, name_fr, display_order, is_active')
      .in('modifier_group_id', groupIds)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })
    
    if (modifiersError) throw modifiersError
    
    console.log('[MODIFIER GROUPS] Found modifiers:', modifiers?.length || 0)
    
    // Step 3: Get prices for the modifiers from modifier_prices table
    const modifierIds = (modifiers || []).map((m: any) => m.id)
    let modifierPrices: any[] = []
    
    if (modifierIds.length > 0) {
      const { data: pricesData, error: pricesError } = await supabase
        .schema('menuca_v3')
        .from('modifier_prices')
        .select('id, modifier_id, price, modifier_size_variant_id')
        .in('modifier_id', modifierIds)
      
      if (!pricesError) {
        modifierPrices = pricesData || []
      }
    }
    
    // Build modifier lookup with prices
    const modifiersByGroup: Record<number, any[]> = {}
    ;(modifiers || []).forEach((m: any) => {
      if (!modifiersByGroup[m.modifier_group_id]) {
        modifiersByGroup[m.modifier_group_id] = []
      }
      // Get base price (null/1 modifier_size_variant_id) for this modifier
      const basePrice = modifierPrices.find(
        (p: any) => p.modifier_id === m.id && (!p.modifier_size_variant_id || p.modifier_size_variant_id === 1)
      )
      modifiersByGroup[m.modifier_group_id].push({
        id: m.id,
        name: m.name_en,
        name_en: m.name_en,
        name_fr: m.name_fr,
        price: basePrice?.price || 0,
        is_active: m.is_active ?? true,
        display_order: m.display_order
      })
    })
    
    // Build response with modifier groups
    // modifier_groups has: id, restaurant_id, name_en, name_fr, category
    const result = modifierGroups.map((g: any) => ({
      id: g.id,
      name: g.name_en,
      name_en: g.name_en,
      name_fr: g.name_fr,
      category: g.category,
      created_at: g.created_at,
      modifiers: modifiersByGroup[g.id] || []
    }))

    console.log(`[MODIFIER GROUPS API] Returning ${result.length} modifier groups for restaurant ${restaurantId}`)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[MODIFIER GROUPS GET ERROR]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch modifier groups' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient() as any

    const body = await request.json()
    const validatedData = createGlobalGroupSchema.parse(body)

    if (validatedData.min_selections > validatedData.max_selections) {
      return NextResponse.json(
        { error: 'min_selections cannot be greater than max_selections' },
        { status: 400 }
      )
    }

    // Get highest display_order for global groups
    const { data: existingGroups } = await (supabase
      .schema('menuca_v3')
      .from('course_modifier_templates' as any)
      .select('display_order')
      .is('course_id', null)
      .is('deleted_at', null)
      .order('display_order', { ascending: false })
      .limit(1) as any)

    const maxOrder = (existingGroups as any)?.[0]?.display_order ?? -1
    const displayOrder = maxOrder + 1

    // Create global library group (course_id = NULL)
    const { data: template, error: templateError } = await (supabase
      .schema('menuca_v3')
      .from('course_modifier_templates' as any)
      .insert({
        course_id: null,
        name: validatedData.name,
        is_required: validatedData.is_required,
        min_selections: validatedData.min_selections,
        max_selections: validatedData.max_selections,
        display_order: displayOrder,
      } as any)
      .select()
      .single() as any)

    if (templateError) throw templateError

    // Create modifiers for this group
    const modifiersToInsert = validatedData.modifiers.map((mod, index) => ({
      template_id: (template as any).id,
      name: mod.name,
      price: mod.price,
      is_included: mod.is_included,
      display_order: index,
    }))

    const { data: modifiers, error: modifiersError } = await (supabase
      .schema('menuca_v3')
      .from('course_template_modifiers' as any)
      .insert(modifiersToInsert as any)
      .select() as any)

    if (modifiersError) throw modifiersError

    return NextResponse.json({
      ...(template as any),
      modifiers,
    })
  } catch (error: any) {
    console.error('[MODIFIER GROUPS POST ERROR]', error)
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
      { error: error.message || 'Failed to create modifier group' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient() as any

    const body = await request.json()
    const validatedData = updateGlobalGroupSchema.parse(body)

    if (
      validatedData.min_selections !== undefined &&
      validatedData.max_selections !== undefined &&
      validatedData.min_selections > validatedData.max_selections
    ) {
      return NextResponse.json(
        { error: 'min_selections cannot be greater than max_selections' },
        { status: 400 }
      )
    }

    // Verify this is a global library group
    const { data: existing } = await (supabase
      .schema('menuca_v3')
      .from('course_modifier_templates' as any)
      .select('id, course_id')
      .eq('id', validatedData.id)
      .is('deleted_at', null)
      .single() as any)

    if (!existing || (existing as any).course_id !== null) {
      return NextResponse.json(
        { error: 'Only global library groups can be updated via this endpoint' },
        { status: 400 }
      )
    }

    // Update template
    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.is_required !== undefined) updateData.is_required = validatedData.is_required
    if (validatedData.min_selections !== undefined) updateData.min_selections = validatedData.min_selections
    if (validatedData.max_selections !== undefined) updateData.max_selections = validatedData.max_selections
    updateData.updated_at = new Date().toISOString()

    const { data: template, error: templateError } = await (supabase
      .schema('menuca_v3')
      .from('course_modifier_templates' as any)
      .update(updateData)
      .eq('id', validatedData.id)
      .select()
      .single() as any)

    if (templateError) throw templateError

    // Update modifiers if provided
    if (validatedData.modifiers) {
      // Soft delete existing modifiers
      await (supabase
        .schema('menuca_v3')
        .from('course_template_modifiers' as any)
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('template_id', validatedData.id) as any)

      // Insert new modifiers
      const modifiersToInsert = validatedData.modifiers.map((mod, index) => ({
        template_id: validatedData.id,
        name: mod.name,
        price: mod.price,
        is_included: mod.is_included,
        display_order: index,
      }))

      await (supabase
        .schema('menuca_v3')
        .from('course_template_modifiers' as any)
        .insert(modifiersToInsert as any) as any)
    }

    // Fetch updated template with modifiers
    const { data: updated } = await (supabase
      .schema('menuca_v3')
      .from('course_modifier_templates' as any)
      .select(`
        *,
        course_template_modifiers (*)
      `)
      .eq('id', validatedData.id)
      .is('deleted_at', null)
      .single() as any)

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('[MODIFIER GROUPS PATCH ERROR]', error)
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

export async function DELETE(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient() as any

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('id')

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      )
    }

    // Verify this is a global library group
    const { data: existing } = await (supabase
      .schema('menuca_v3')
      .from('course_modifier_templates' as any)
      .select('id, course_id')
      .eq('id', parseInt(groupId))
      .is('deleted_at', null)
      .single() as any)

    if (!existing || (existing as any).course_id !== null) {
      return NextResponse.json(
        { error: 'Only global library groups can be deleted via this endpoint' },
        { status: 400 }
      )
    }

    // Soft delete the library group
    const { error: deleteError } = await (supabase
      .schema('menuca_v3')
      .from('course_modifier_templates' as any)
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', parseInt(groupId)) as any)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[MODIFIER GROUPS DELETE ERROR]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete modifier group' },
      { status: 500 }
    )
  }
}
