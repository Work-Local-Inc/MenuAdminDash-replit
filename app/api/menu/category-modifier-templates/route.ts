import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { checkLibraryLinkingMigrations } from '@/lib/supabase/check-migrations'

const associateLibraryGroupSchema = z.object({
  course_id: z.number().int().positive('Course ID is required'),
  library_template_id: z.number().int().positive('Library template ID is required'),
})

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    
    // RUNTIME GUARD: Check if migrations are applied before allowing associations
    try {
      const migrationStatus = await checkLibraryLinkingMigrations()
      
      if (!migrationStatus.overall_ready) {
        console.warn('[MIGRATION GUARD] Blocking category association - migrations not applied:', migrationStatus.warnings)
        return NextResponse.json(
          {
            error: 'Database migrations required',
            message: 'The library linking feature requires database migrations to be applied. Please run migrations 009 and 010 before creating category associations.',
            warnings: migrationStatus.warnings,
            details: 'See replit.md for migration instructions'
          },
          { status: 503 }
        )
      }
    } catch (migrationCheckError) {
      console.warn('[MIGRATION GUARD] Could not verify migration status, proceeding with caution:', migrationCheckError)
      // Continue but log warning - in development, database might be temporarily unavailable
    }
    
    const supabase = createAdminClient()

    const body = await request.json()
    const validatedData = associateLibraryGroupSchema.parse(body)

    // Fetch the library group template
    const { data: libraryGroup, error: libraryError } = await (supabase
      .schema('menuca_v3')
      .from('course_modifier_templates' as any)
      .select(`
        *,
        course_template_modifiers (*)
      `)
      .eq('id', validatedData.library_template_id)
      .is('course_id', null)
      .is('deleted_at', null)
      .single() as any)

    if (libraryError || !libraryGroup) {
      return NextResponse.json(
        { error: 'Library group not found or invalid' },
        { status: 404 }
      )
    }

    // Check if this category already has this library group associated
    const { data: existing } = await (supabase
      .schema('menuca_v3')
      .from('course_modifier_templates' as any)
      .select('id')
      .eq('course_id', validatedData.course_id)
      .eq('library_template_id', validatedData.library_template_id)
      .is('deleted_at', null)
      .single() as any)

    if (existing) {
      return NextResponse.json(
        { error: 'This category is already associated with this library group' },
        { status: 400 }
      )
    }

    // Get highest display_order for this category's templates
    const { data: existingTemplates } = await (supabase
      .schema('menuca_v3')
      .from('course_modifier_templates' as any)
      .select('display_order')
      .eq('course_id', validatedData.course_id)
      .is('deleted_at', null)
      .order('display_order', { ascending: false })
      .limit(1) as any)

    const maxOrder = (existingTemplates as any)?.[0]?.display_order ?? -1
    const displayOrder = maxOrder + 1

    // Create category association template (references library group)
    const { data: categoryTemplate, error: templateError } = await (supabase
      .schema('menuca_v3')
      .from('course_modifier_templates' as any)
      .insert({
        course_id: validatedData.course_id,
        library_template_id: validatedData.library_template_id,
        name: (libraryGroup as any).name,
        is_required: (libraryGroup as any).is_required,
        min_selections: (libraryGroup as any).min_selections,
        max_selections: (libraryGroup as any).max_selections,
        display_order: displayOrder,
      } as any)
      .select()
      .single() as any)

    if (templateError) throw templateError

    // DO NOT CLONE MODIFIERS - they are fetched via JOIN through library_template_id
    // The library_template_id FK is the link to the library group's modifiers

    // Apply template to all existing dishes in the category
    const { data: dishes } = await (supabase
      .schema('menuca_v3')
      .from('dishes' as any)
      .select('id')
      .eq('course_id', validatedData.course_id)
      .is('deleted_at', null) as any)

    if (dishes && (dishes as any[]).length > 0) {
      for (const dish of dishes as any[]) {
        // Get highest display_order for this dish's modifier groups
        const { data: existingGroups } = await (supabase
          .schema('menuca_v3')
          .from('dish_modifier_groups' as any)
          .select('display_order')
          .eq('dish_id', dish.id)
          .is('deleted_at', null)
          .order('display_order', { ascending: false })
          .limit(1) as any)

        const maxGroupOrder = (existingGroups as any)?.[0]?.display_order ?? -1
        const groupDisplayOrder = maxGroupOrder + 1

        // Create dish modifier group (inherited from category template)
        const { data: dishGroup, error: dishGroupError } = await (supabase
          .schema('menuca_v3')
          .from('dish_modifier_groups' as any)
          .insert({
            dish_id: dish.id,
            course_template_id: (categoryTemplate as any).id,
            name: (categoryTemplate as any).name,
            is_required: (categoryTemplate as any).is_required,
            min_selections: (categoryTemplate as any).min_selections,
            max_selections: (categoryTemplate as any).max_selections,
            display_order: groupDisplayOrder,
            is_custom: false,
          } as any)
          .select()
          .single() as any)

        if (dishGroupError) throw dishGroupError

        // DO NOT CLONE MODIFIERS TO DISHES
        // Dish modifiers are fetched via JOIN: dish → category template → library template → modifiers
        // This ensures updates to library group propagate to all dishes automatically
      }
    }

    return NextResponse.json({
      success: true,
      template: categoryTemplate,
      dishes_updated: (dishes as any[])?.length || 0,
    })
  } catch (error: any) {
    console.error('[CATEGORY MODIFIER ASSOCIATION ERROR]', error)
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
      { error: error.message || 'Failed to associate library group with category' },
      { status: 500 }
    )
  }
}
