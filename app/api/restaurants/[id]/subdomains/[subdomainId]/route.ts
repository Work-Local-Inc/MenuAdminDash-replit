import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'
import { z } from 'zod'
import { invalidateCache } from '@/lib/subdomain-mapping'

const updateSubdomainSchema = z.object({
  subdomain: z.string().min(1).regex(/^[a-z0-9]+([\.\-][a-z0-9]+)*$/).optional(),
  slug: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  is_primary: z.boolean().optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; subdomainId: string } }
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
    
    const validatedData = updateSubdomainSchema.parse(body)
    
    const updateData: Record<string, any> = {}
    if (validatedData.subdomain !== undefined) updateData.subdomain = validatedData.subdomain.toLowerCase()
    if (validatedData.slug !== undefined) updateData.slug = validatedData.slug
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.is_primary !== undefined) updateData.is_primary = validatedData.is_primary
    if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active

    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('restaurant_subdomains')
      .update(updateData)
      .eq('id', parseInt(params.subdomainId))
      .eq('restaurant_id', restaurantId)
      .select()
      .single()

    if (error) {
      console.error('[Subdomains PATCH] Error:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'This subdomain is already in use' }, { status: 400 })
      }
      throw error
    }

    invalidateCache()

    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    console.error('[Subdomains PATCH] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update subdomain' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; subdomainId: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const restaurantId = parseInt(params.id)
    
    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    
    const supabase = createAdminClient() as any

    const { error } = await supabase
      .schema('menuca_v3')
      .from('restaurant_subdomains')
      .delete()
      .eq('id', parseInt(params.subdomainId))
      .eq('restaurant_id', restaurantId)

    if (error) {
      console.error('[Subdomains DELETE] Error:', error)
      throw error
    }

    invalidateCache()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[Subdomains DELETE] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete subdomain' }, { status: 500 })
  }
}
