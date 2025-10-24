import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
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
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)
    
    const supabase = createAdminClient()
    
    // TODO: Add role-based access control check once RBAC is implemented (Phase 3)
    // Only admin users should be able to submit admin responses
    
    let body
    try {
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)
    
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
