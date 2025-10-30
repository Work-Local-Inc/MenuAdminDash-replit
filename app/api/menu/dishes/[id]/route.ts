import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const updateDishSchema = z.object({
  course_id: z.number().nullable().optional(),
  name: z.string().min(1, 'Name is required').max(255).optional(),
  description: z.string().nullable().optional(),
  price: z.number().min(0, 'Price must be positive').optional(),
  image_url: z.string().url().nullable().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('dishes')
      .select(`
        id, 
        restaurant_id,
        course_id,
        name, 
        description, 
        price, 
        image_url,
        is_active, 
        is_featured,
        display_order, 
        created_at, 
        updated_at
      `)
      .eq('id', parseInt(params.id))
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Dish not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dish' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()

    const body = await request.json()
    const validatedData = updateDishSchema.parse(body)

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (validatedData.course_id !== undefined) updateData.course_id = validatedData.course_id
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.price !== undefined) updateData.price = validatedData.price
    if (validatedData.image_url !== undefined) updateData.image_url = validatedData.image_url
    if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active
    if (validatedData.is_featured !== undefined) updateData.is_featured = validatedData.is_featured
    if (validatedData.display_order !== undefined) updateData.display_order = validatedData.display_order

    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('dishes')
      .update(updateData)
      .eq('id', parseInt(params.id))
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Dish not found' },
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
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update dish' },
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

    // Delete the dish
    const { error } = await supabase
      .schema('menuca_v3')
      .from('dishes')
      .delete()
      .eq('id', parseInt(params.id))

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete dish' },
      { status: 500 }
    )
  }
}
