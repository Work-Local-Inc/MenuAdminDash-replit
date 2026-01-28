import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  try {
    await verifyAdminAuth(request)
    
    const supabase = createAdminClient() as any
    const restaurantId = parseInt(params.id)
    const contactId = parseInt(params.contactId)

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

    // Fallback: Update directly in the database
    // restaurant_contacts table stores the contact data
    const updateData: any = {}
    if (body.first_name !== undefined) updateData.first_name = body.first_name
    if (body.last_name !== undefined) updateData.last_name = body.last_name
    if (body.email !== undefined) updateData.email = body.email || null
    if (body.phone !== undefined) updateData.phone = body.phone || null
    if (body.title !== undefined) updateData.title = body.title || null
    if (body.preferred_language !== undefined) updateData.preferred_language = body.preferred_language
    if (body.receives_orders !== undefined) updateData.receives_orders = body.receives_orders
    if (body.receives_statements !== undefined) updateData.receives_statements = body.receives_statements
    if (body.receives_marketing !== undefined) updateData.receives_marketing = body.receives_marketing
    updateData.updated_at = new Date().toISOString()

    console.log('[Update Contact] Direct update data:', updateData)

    const { data: updatedContact, error: updateError } = await supabase
      .schema('menuca_v3')
      .from('restaurant_contacts')
      .update(updateData)
      .eq('id', contactId)
      .eq('restaurant_id', restaurantId)
      .select()
      .single()

    if (updateError) {
      console.error('[Update Contact] Direct update error:', updateError)
      throw updateError
    }

    console.log('[Update Contact] Direct update success:', updatedContact)
    return NextResponse.json({ success: true, contact: updatedContact })
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
    await verifyAdminAuth(request)
    
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
