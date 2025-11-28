import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { getRestaurantById } from '@/lib/supabase/queries'
import { createAdminClient } from '@/lib/supabase/admin'
import { restaurantUpdateSchema } from '@/lib/validations/restaurant'
import { AuthError } from '@/lib/errors'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
    
    const restaurant = await getRestaurantById(params.id)
    return NextResponse.json(restaurant)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch restaurant' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
    
    const supabase = createAdminClient() as any

    const body = await request.json()
    
    // Validate request body
    const validatedData = restaurantUpdateSchema.parse(body)

    // If status is being updated, use Edge Function for audit trail
    if (validatedData.status) {
      const { data: statusData, error: statusError } = await supabase.functions.invoke('update-restaurant-status', {
        body: {
          restaurant_id: parseInt(params.id),
          new_status: validatedData.status,
          reason: body.reason || `Status changed to ${validatedData.status} by admin`
        }
      })

      if (statusError) throw statusError

      if (!statusData?.success) {
        return NextResponse.json({ 
          error: statusData?.message || 'Failed to update status' 
        }, { status: 400 })
      }

      // Remove status from validatedData so we don't update it again
      const { status, ...otherFields } = validatedData

      // If there are other fields to update (name, timezone, etc.), update them separately
      if (Object.keys(otherFields).length > 0) {
        const { error: updateError } = await supabase
          .from('restaurants')
          .update(otherFields)
          .eq('id', params.id)

        if (updateError) throw updateError
      }
    } else {
      // No status change - direct update for non-sensitive fields (name, timezone, etc.)
      const { data, error } = await supabase
        .from('restaurants')
        .update(validatedData)
        .eq('id', params.id)
        .select()
        .single()

      // If error is about unknown column (logo_display_mode not yet added to DB), 
      // retry without that field
      if (error && error.message?.includes('logo_display_mode')) {
        const { logo_display_mode, ...dataWithoutLogoMode } = validatedData as any
        const { data: retryData, error: retryError } = await supabase
          .from('restaurants')
          .update(dataWithoutLogoMode)
          .eq('id', params.id)
          .select()
          .single()
        
        if (retryError) throw retryError
      } else if (error) {
        throw error
      }
    }

    // Fetch and return the updated restaurant
    const { data: restaurant, error: fetchError } = await supabase
      .from('restaurants')
      .select()
      .eq('id', params.id)
      .single()

    if (fetchError) throw fetchError

    return NextResponse.json(restaurant)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update restaurant' },
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

    let reason = 'Restaurant deactivated by admin'
    try {
      const body = await request.json()
      if (body.reason) {
        reason = body.reason
      }
    } catch {
      // No body or invalid JSON - use default reason
    }

    const { data, error } = await supabase.functions.invoke('update-restaurant-status', {
      body: {
        restaurant_id: parseInt(params.id),
        new_status: 'inactive',
        reason: reason
      }
    })

    if (error) throw error

    if (!data?.success) {
      return NextResponse.json({ 
        error: data?.message || 'Failed to deactivate restaurant' 
      }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate restaurant' },
      { status: 500 }
    )
  }
}
