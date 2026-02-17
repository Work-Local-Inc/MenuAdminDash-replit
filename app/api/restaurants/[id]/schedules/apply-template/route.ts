import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { z } from 'zod'
export const dynamic = 'force-dynamic'

const templateSchema = z.object({
  template_name: z.enum([
    "24/7",
    "Mon-Fri 9-5",
    "Mon-Fri 11-9, Sat-Sun 11-10",
    "Lunch & Dinner"
  ]),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    
    const restaurantId = parseInt(params.id)
    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    
    const supabase = createAdminClient() as any
    const body = await request.json()
    
    // Validate template name
    const validatedData = templateSchema.parse(body)

    const { data, error } = await supabase.functions.invoke('apply-schedule-template', {
      body: {
        restaurant_id: parseInt(params.id),
        template_name: validatedData.template_name
      }
    })

    if (error) throw error

    if (!data?.success) {
      return NextResponse.json({ 
        error: data?.message || 'Failed to apply template' 
      }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid template name', 
        details: error.errors 
      }, { status: 400 })
    }
    return NextResponse.json({ 
      error: error.message || 'Failed to apply schedule template' 
    }, { status: 500 })
  }
}
