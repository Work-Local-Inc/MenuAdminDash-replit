import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const updateCourseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  description: z.string().nullable().optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient() as any

    const body = await request.json()
    const validatedData = updateCourseSchema.parse(body)

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.display_order !== undefined) updateData.display_order = validatedData.display_order
    if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active

    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('courses')
      .update(updateData)
      .eq('id', parseInt(params.id))
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Course not found' },
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
      { error: error.message || 'Failed to update course' },
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
    const supabase = createAdminClient() as any

    // Check if course has any dishes
    const { data: dishes, error: dishCheckError } = await supabase
      .schema('menuca_v3')
      .from('dishes')
      .select('id')
      .eq('course_id', parseInt(params.id))
      .limit(1)

    if (dishCheckError) throw dishCheckError

    if (dishes && dishes.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete course with existing dishes. Please reassign or delete dishes first.' },
        { status: 400 }
      )
    }

    // Delete the course
    const { error } = await supabase
      .schema('menuca_v3')
      .from('courses')
      .delete()
      .eq('id', parseInt(params.id))

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete course' },
      { status: 500 }
    )
  }
}
