import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const paymentMethodUpdateSchema = z.object({
  payment_provider: z.enum(['stripe', 'square', 'paypal', 'cash', 'interac']).optional(),
  provider_account_id: z.string().optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; methodId: string } }
) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Validate request body
    const validatedData = paymentMethodUpdateSchema.parse(body)
    
    const { data, error } = await supabase
      .from('restaurant_payment_methods')
      .update(validatedData)
      .eq('id', parseInt(params.methodId))
      .eq('restaurant_id', parseInt(params.id))
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: error.message || 'Failed to update payment method' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; methodId: string } }
) {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('restaurant_payment_methods')
      .delete()
      .eq('id', parseInt(params.methodId))
      .eq('restaurant_id', parseInt(params.id))
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete payment method' }, { status: 500 })
  }
}
