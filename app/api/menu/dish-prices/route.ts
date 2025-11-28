import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyRestaurantPermission } from '@/lib/api/promotions'
import { z } from 'zod'

const createPriceSchema = z.object({
  dish_id: z.number().int().positive(),
  size_variant: z.string().min(1).max(100).nullable(),
  price: z.number().min(0),
  display_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
})

const updatePriceSchema = z.object({
  id: z.number().int().positive(),
  size_variant: z.string().min(1).max(100).nullable().optional(),
  price: z.number().min(0).optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
})

const deletePriceSchema = z.object({
  id: z.number().int().positive(),
})

// GET /api/menu/dish-prices?dish_id=123
export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient() as any

    const { searchParams } = new URL(request.url)
    const dishId = searchParams.get('dish_id')

    if (!dishId) {
      return NextResponse.json(
        { error: 'dish_id query parameter is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('dish_prices')
      .select('id, price, size_variant, display_order, is_active')
      .eq('dish_id', parseInt(dishId))
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dish prices' },
      { status: 500 }
    )
  }
}

// POST /api/menu/dish-prices - Create new price variant
export async function POST(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request) as { adminUser: any }
    const supabase = createAdminClient() as any

    const body = await request.json()
    const validatedData = createPriceSchema.parse(body)

    // Fetch dish with its course to verify ownership
    const { data: dish, error: dishError } = await supabase
      .schema('menuca_v3')
      .from('dishes')
      .select(`
        id,
        course_id,
        courses:course_id (
          restaurant_id
        )
      `)
      .eq('id', validatedData.dish_id)
      .single()

    if (dishError || !dish) {
      return NextResponse.json(
        { error: 'Dish not found' },
        { status: 404 }
      )
    }

    // Verify admin has permission for this restaurant
    const restaurantId = (dish.courses as any)?.restaurant_id
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Dish is not associated with a valid course/restaurant' },
        { status: 400 }
      )
    }

    const hasPermission = await verifyRestaurantPermission(adminUser.id, restaurantId)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to modify prices for this dish' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('dish_prices')
      .insert({
        dish_id: validatedData.dish_id,
        size_variant: validatedData.size_variant,
        price: validatedData.price,
        display_order: validatedData.display_order,
        is_active: validatedData.is_active,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create dish price' },
      { status: 500 }
    )
  }
}

// PATCH /api/menu/dish-prices - Update price variant
export async function PATCH(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request) as { adminUser: any }
    const supabase = createAdminClient() as any

    const body = await request.json()
    const validatedData = updatePriceSchema.parse(body)

    // First, fetch the price variant to get its dish_id
    const { data: existingPrice, error: fetchError } = await supabase
      .schema('menuca_v3')
      .from('dish_prices')
      .select(`
        id,
        dish_id,
        dishes:dish_id (
          id,
          course_id,
          courses:course_id (
            restaurant_id
          )
        )
      `)
      .eq('id', validatedData.id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingPrice) {
      return NextResponse.json(
        { error: 'Price variant not found' },
        { status: 404 }
      )
    }

    // Verify admin has permission for this restaurant
    const restaurantId = (existingPrice.dishes as any)?.courses?.restaurant_id
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Price variant is not associated with a valid dish/course/restaurant' },
        { status: 400 }
      )
    }

    const hasPermission = await verifyRestaurantPermission(adminUser.id, restaurantId)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to modify prices for this dish' },
        { status: 403 }
      )
    }

    // Now perform the update
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (validatedData.size_variant !== undefined) updateData.size_variant = validatedData.size_variant
    if (validatedData.price !== undefined) updateData.price = validatedData.price
    if (validatedData.display_order !== undefined) updateData.display_order = validatedData.display_order
    if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active

    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('dish_prices')
      .update(updateData)
      .eq('id', validatedData.id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Price variant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update dish price' },
      { status: 500 }
    )
  }
}

// DELETE /api/menu/dish-prices - Soft delete price variant
export async function DELETE(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request) as { adminUser: any }
    const supabase = createAdminClient() as any

    const body = await request.json()
    const validatedData = deletePriceSchema.parse(body)

    // First, fetch the price variant to get its dish_id and verify ownership
    const { data: existingPrice, error: fetchError } = await supabase
      .schema('menuca_v3')
      .from('dish_prices')
      .select(`
        id,
        dish_id,
        dishes:dish_id (
          id,
          course_id,
          courses:course_id (
            restaurant_id
          )
        )
      `)
      .eq('id', validatedData.id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingPrice) {
      return NextResponse.json(
        { error: 'Price variant not found or already deleted' },
        { status: 404 }
      )
    }

    // Verify admin has permission for this restaurant
    const restaurantId = (existingPrice.dishes as any)?.courses?.restaurant_id
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Price variant is not associated with a valid dish/course/restaurant' },
        { status: 400 }
      )
    }

    const hasPermission = await verifyRestaurantPermission(adminUser.id, restaurantId)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to delete prices for this dish' },
        { status: 403 }
      )
    }

    // Now perform the soft delete
    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('dish_prices')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', validatedData.id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Price variant not found or already deleted' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete dish price' },
      { status: 500 }
    )
  }
}
