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

    const body = await request.json()
    
    const { data, error } = await supabase.functions.invoke('update-restaurant-contact', {
      body: {
        restaurant_id: parseInt(params.id),
        contact_id: parseInt(params.contactId),
        ...body
      }
    })

    if (error) throw error

    if (!data?.success) {
      return NextResponse.json({ 
        error: data?.message || 'Failed to update contact' 
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
