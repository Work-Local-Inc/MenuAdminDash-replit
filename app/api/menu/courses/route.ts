import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const createCourseSchema = z.object({
  restaurant_id: z.number(),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().nullable().optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional().default(true),
})

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('courses')
      .select('id, name, description, display_order, is_active, created_at, updated_at')
      .eq('restaurant_id', parseInt(restaurantId))
      .order('display_order', { ascending: true })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()

    const body = await request.json()
    
    // Validate input
    const validatedData = createCourseSchema.parse(body)

    // Get the max display_order for this restaurant
    const { data: existingCourses } = await supabase
      .schema('menuca_v3')
      .from('courses')
      .select('display_order')
      .eq('restaurant_id', validatedData.restaurant_id)
      .order('display_order', { ascending: false })
      .limit(1)

    const maxOrder = existingCourses?.[0]?.display_order ?? -1
    const displayOrder = validatedData.display_order ?? (maxOrder + 1)

    // Create the course
    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('courses')
      .insert({
        restaurant_id: validatedData.restaurant_id,
        name: validatedData.name,
        description: validatedData.description || null,
        display_order: displayOrder,
        is_active: validatedData.is_active,
      })
      .select()
      .single()

    if (error) throw error

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
      { error: error.message || 'Failed to create course' },
      { status: 500 }
    )
  }
}
