import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { z } from 'zod'

const responseSchema = z.object({
  admin_response: z.string().min(1, 'Response cannot be empty').max(1000, 'Response must be less than 1000 characters'),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; feedbackId: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    
    const restaurantId = parseInt(params.id)
    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    
    const supabase = createAdminClient() as any
    
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid or missing request body' },
        { status: 400 }
      )
    }
    
    // Validate request body
    const validatedData = responseSchema.parse(body)
    
    // Update the feedback with admin response
    const { data, error } = await supabase
      .from('restaurant_feedback')
      .update({
        admin_response: validatedData.admin_response,
        response_at: new Date().toISOString(),
      })
      .eq('id', parseInt(params.feedbackId))
      .eq('restaurant_id', parseInt(params.id))
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: error.message || 'Failed to update response' }, { status: 500 })
  }
}
