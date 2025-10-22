import { NextRequest, NextResponse } from 'next/server'
import { getRestaurantById } from '@/lib/supabase/queries'
import { createClient } from '@/lib/supabase/server'
import { restaurantUpdateSchema } from '@/lib/validations/restaurant'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurant = await getRestaurantById(params.id)
    return NextResponse.json(restaurant)
  } catch (error: any) {
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
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const validatedData = restaurantUpdateSchema.parse(body)

    const { data, error } = await supabase
      .from('menuca_v3.restaurants')
      .update(validatedData)
      .eq('id', params.id)
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
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('menuca_v3.restaurants')
      .update({ 
        status: 'inactive',
        online_ordering_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      message: 'Restaurant status changed to inactive' 
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to deactivate restaurant' },
      { status: 500 }
    )
  }
}
