import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const createDishSchema = z.object({
  restaurant_id: z.number(),
  course_id: z.number().nullable().optional(),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().nullable().optional(),
  price: z.number().min(0, 'Price must be positive'),
  image_url: z.string().url().nullable().optional(),
  is_active: z.boolean().optional().default(true),
  is_featured: z.boolean().optional().default(false),
  display_order: z.number().int().min(0).optional(),
})

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')
    const courseId = searchParams.get('course_id')
    const isActive = searchParams.get('is_active')

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .schema('menuca_v3')
      .from('dishes')
      .select(`
        id, 
        restaurant_id,
        course_id,
        name, 
        description, 
        image_url,
        is_active, 
        is_featured,
        display_order, 
        created_at, 
        updated_at,
        dish_prices (
          id,
          price,
          size_variant,
          display_order
        )
      `)
      .eq('restaurant_id', parseInt(restaurantId))

    if (courseId) {
      if (courseId === 'null') {
        query = query.is('course_id', null)
      } else {
        query = query.eq('course_id', parseInt(courseId))
      }
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true')
    }

    query = query.order('display_order', { ascending: true })

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dishes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()

    const body = await request.json()
    const validatedData = createDishSchema.parse(body)

    // Get the max display_order for this restaurant/course
    let orderQuery = supabase
      .schema('menuca_v3')
      .from('dishes')
      .select('display_order')
      .eq('restaurant_id', validatedData.restaurant_id)

    if (validatedData.course_id) {
      orderQuery = orderQuery.eq('course_id', validatedData.course_id)
    } else {
      orderQuery = orderQuery.is('course_id', null)
    }

    const { data: existingDishes } = await orderQuery
      .order('display_order', { ascending: false })
      .limit(1)

    const maxOrder = existingDishes?.[0]?.display_order ?? -1
    const displayOrder = validatedData.display_order ?? (maxOrder + 1)

    // Create the dish
    const { data: dish, error } = await supabase
      .schema('menuca_v3')
      .from('dishes')
      .insert({
        restaurant_id: validatedData.restaurant_id,
        course_id: validatedData.course_id || null,
        name: validatedData.name,
        description: validatedData.description || null,
        image_url: validatedData.image_url || null,
        is_active: validatedData.is_active,
        is_featured: validatedData.is_featured,
        display_order: displayOrder,
      })
      .select()
      .single()

    if (error) throw error

    // Create default price variant
    const { error: priceError } = await supabase
      .schema('menuca_v3')
      .from('dish_prices')
      .insert({
        dish_id: dish.id,
        price: validatedData.price,
        size_variant: null, // Default price with no size variant
        display_order: 0,
      })

    if (priceError) throw priceError

    // Auto-apply category modifier templates if dish belongs to a category
    if (validatedData.course_id) {
      const { data: templates, error: templatesError } = await (supabase
        .schema('menuca_v3')
        .from('course_modifier_templates' as any)
        .select('id, name')
        .eq('course_id', validatedData.course_id)
        .not('library_template_id', 'is', null) // Only category associations
        .is('deleted_at', null) as any)

      if (templatesError) {
        console.error('[FETCH TEMPLATES ERROR]', templatesError)
      }

      if (templates && (templates as any[]).length > 0) {
        const templateResults: any[] = []
        
        // Apply each template to the new dish
        for (const template of templates as any[]) {
          const { data, error } = await (supabase.rpc as any)('apply_template_to_dish', {
            p_dish_id: dish.id,
            p_template_id: template.id,
          })

          if (error) {
            console.error(`[APPLY TEMPLATE ERROR] Template ${template.id} (${template.name}):`, error)
            templateResults.push({
              template_id: template.id,
              template_name: template.name,
              success: false,
              error: error.message
            })
          } else {
            templateResults.push({
              template_id: template.id,
              template_name: template.name,
              success: true,
              modifier_group_id: data
            })
          }
        }

        // Log summary of template applications
        const successCount = templateResults.filter(r => r.success).length
        const failCount = templateResults.filter(r => !r.success).length
        console.log(`[MODIFIER APPLICATION] Dish ${dish.id}: ${successCount} succeeded, ${failCount} failed`, templateResults)
      }
    }

    // Return dish with price info
    return NextResponse.json({
      ...dish,
      dish_prices: [{
        price: validatedData.price,
        size_variant: null,
        display_order: 0
      }]
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
      { error: error.message || 'Failed to create dish' },
      { status: 500 }
    )
  }
}
