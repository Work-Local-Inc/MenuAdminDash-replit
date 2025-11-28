import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const reorderSchema = z.object({
  restaurant_id: z.number(),
  course_ids: z.array(z.number()).min(1, 'At least one course ID is required'),
})

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient() as any

    const body = await request.json()
    const validatedData = reorderSchema.parse(body)

    // Update display_order for each course
    const updates = validatedData.course_ids.map((courseId, index) => {
      return supabase
        .schema('menuca_v3')
        .from('courses')
        .update({ display_order: index, updated_at: new Date().toISOString() })
        .eq('id', courseId)
        .eq('restaurant_id', validatedData.restaurant_id)
    })

    await Promise.all(updates)

    return NextResponse.json({ success: true })
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
      { error: error.message || 'Failed to reorder courses' },
      { status: 500 }
    )
  }
}
