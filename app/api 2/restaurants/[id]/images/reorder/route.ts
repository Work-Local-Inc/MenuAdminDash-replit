import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { z } from 'zod'

const reorderSchema = z.object({
  imageOrders: z.array(
    z.object({
      id: z.number(),
      display_order: z.number().int().nonnegative(),
    })
  ).min(1, 'At least one image order must be provided'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
    
    const supabase = createAdminClient()
    
    let body
    try {
    await verifyAdminAuth(request)
    
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid or missing request body' },
        { status: 400 }
      )
    }
    
    // Validate request body server-side
    const { imageOrders } = reorderSchema.parse(body)
    
    // Update display_order for all affected images
    const updates = imageOrders.map(({ id, display_order }) =>
      supabase
        .from('restaurant_images')
        .update({ display_order })
        .eq('id', id)
        .eq('restaurant_id', parseInt(params.id))
    )
    
    const results = await Promise.all(updates)
    
    // Check if any updates failed
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      throw new Error(`Failed to update ${errors.length} images`)
    }
    
    return NextResponse.json({ success: true, updated: imageOrders.length })
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
    return NextResponse.json({ error: error.message || 'Failed to reorder images' }, { status: 500 })
  }
}
