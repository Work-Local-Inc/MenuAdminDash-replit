import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantPermission } from '@/lib/api/promotions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createDealSchema, type CreateDealInput } from '@/lib/validation/promotions'
import type { Database } from '@/types/supabase-database'
import { z } from 'zod'

type PromotionalDealInsert = Database['menuca_v3']['Tables']['promotional_deals']['Insert']

/**
 * POST /api/admin/promotions/deals/create
 * Create a new promotional deal (Feature 9)
 */
export async function POST(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request) as { adminUser: any }
    const body = await request.json()
    
    console.log('[Create Deal] Admin user:', adminUser)
    console.log('[Create Deal] Request body:', JSON.stringify(body, null, 2))

    // Validate request body with Zod
    const validated = createDealSchema.parse(body)
    console.log('[Create Deal] Validated:', JSON.stringify(validated, null, 2))

    // Verify admin has permission for this restaurant
    const hasPermission = await verifyRestaurantPermission(adminUser.id, validated.restaurant_id)
    console.log('[Create Deal] Permission check:', { adminUserId: adminUser.id, restaurantId: validated.restaurant_id, hasPermission })
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to create deals for this restaurant' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient() as any

    // Create the deal with validated data
    // Note: created_at and updated_at are handled by database defaults
    // IMPORTANT: promotional_deals is in menuca_v3 schema (configured in admin client)
    // Remove fields that don't exist in the database: description, description_fr, type
    // Add required fields: deal_type_legacy (NOT NULL constraint in DB)
    const { description, description_fr, ...restData } = validated
    
    // Map deal_type values for database requirements
    // The database has 'deal_type_legacy' as a NOT NULL column
    const dealTypeValue = restData.deal_type || 'percent'
    const dbData = {
      ...restData,
      deal_type_legacy: dealTypeValue, // Required column (legacy compatibility)
    }
    
    console.log('[Create Deal] Final DB data:', JSON.stringify(dbData, null, 2))
    
    // Note: createAdminClient() already configures menuca_v3 as default schema
    const { data: deal, error } = await supabase
      .from('promotional_deals')
      .insert(dbData as any)
      .select()
      .single()

    if (error) {
      console.error('[Create Deal] Database error:', error)
      throw error
    }

    return NextResponse.json({ deal }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/promotions/deals/create]', error)

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create deal' },
      { status: 500 }
    )
  }
}
