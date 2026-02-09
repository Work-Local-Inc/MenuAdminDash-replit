import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access'
import { AuthError } from '@/lib/errors'
export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    
    const supabase = createAdminClient() as any
    const restaurantId = parseInt(params.id)
    const contactId = parseInt(params.contactId)

    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const body = await request.json()
    console.log('[Update Contact] Restaurant ID:', restaurantId, 'Contact ID:', contactId, 'Body:', JSON.stringify(body))
    
    // Try Edge Function first
    try {
      const { data, error } = await supabase.functions.invoke('update-restaurant-contact', {
        body: {
          restaurant_id: restaurantId,
          contact_id: contactId,
          ...body
        }
      })

      if (!error && data?.success) {
        console.log('[Update Contact] Edge function success:', data)
        return NextResponse.json(data)
      }

      console.log('[Update Contact] Edge function failed, falling back to direct update. Error:', error, 'Data:', data)
    } catch (edgeFnError) {
      console.log('[Update Contact] Edge function threw error, falling back to direct update:', edgeFnError)
    }

    // Fallback: Update restaurant_locations table for phone/email
    // The contactId matches the location ID from restaurant_locations
    const locationUpdateData: any = {}
    if (body.phone !== undefined) locationUpdateData.phone = body.phone || null
    if (body.email !== undefined) locationUpdateData.email = body.email || null
    locationUpdateData.updated_at = new Date().toISOString()

    console.log('[Update Contact] Updating restaurant_locations with:', locationUpdateData)

    const { data: updatedLocation, error: updateError } = await supabase
      .from('restaurant_locations')
      .update(locationUpdateData)
      .eq('id', contactId)
      .eq('restaurant_id', restaurantId)
      .select()
      .single()

    if (updateError) {
      console.error('[Update Contact] Location update error:', updateError)
      throw updateError
    }

    console.log('[Update Contact] Location update success:', updatedLocation)
    return NextResponse.json({ 
      success: true, 
      contact: {
        id: updatedLocation.id,
        phone: updatedLocation.phone,
        email: updatedLocation.email,
        type: 'location'
      }
    })
  } catch (error: any) {
    console.error('[Update Contact] Final error:', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error.message || 'Failed to update contact' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    
    const restaurantId = parseInt(params.id)
    const access = await verifyRestaurantAccess(adminUser as any, restaurantId)
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    
    const supabase = createAdminClient() as any

    let reason = 'Deleted by admin'
    try {
      const body = await request.json()
      if (body.reason) {
        reason = body.reason
      }
    } catch {
      // No body - use default reason
    }

    const { data, error } = await supabase.functions.invoke('delete-restaurant-contact', {
      method: 'DELETE',
      body: {
        contact_id: parseInt(params.contactId),
        reason: reason
      }
    })

    if (error) throw error

    if (!data?.success) {
      return NextResponse.json({ 
        error: data?.message || 'Failed to delete contact' 
      }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
