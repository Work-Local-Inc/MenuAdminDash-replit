import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const imageCreateSchema = z.object({
  image_url: z.string().url('Must be a valid URL'),
  description: z.string().max(500, 'Description must be 500 characters or less').nullable().optional(),
  display_order: z.number().int().nonnegative().optional(),
})

const imageUpdateSchema = z.object({
  description: z.string().max(500).nullable().optional(),
  display_order: z.number().int().nonnegative().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)

    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .schema('menuca_v3').from('restaurant_images')
      .select('*')
      .eq('restaurant_id', parseInt(params.id))
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })
    
    if (error) throw error
    
    return NextResponse.json(data || [])
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch images' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient()
    
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid or missing request body' },
        { status: 400 }
      )
    }
    
    // Validate request body server-side
    const validatedData = imageCreateSchema.parse(body)
    
    const { data, error } = await supabase
      .schema('menuca_v3').from('restaurant_images')
      .insert({
        restaurant_id: parseInt(params.id),
        ...validatedData,
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
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
    return NextResponse.json({ error: error.message || 'Failed to create image' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient()
    
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid or missing request body' },
        { status: 400 }
      )
    }
    
    if (!body.image_id) {
      return NextResponse.json(
        { error: 'image_id is required' },
        { status: 400 }
      )
    }
    
    // Validate update data
    const validatedData = imageUpdateSchema.parse(body)
    
    // Ensure at least one field is being updated
    const hasValidData = Object.values(validatedData).some(val => val !== undefined)
    if (!hasValidData) {
      return NextResponse.json(
        { error: 'At least one field must be provided' },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .schema('menuca_v3').from('restaurant_images')
      .update(validatedData)
      .eq('id', body.image_id)
      .eq('restaurant_id', parseInt(params.id))
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
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
    return NextResponse.json({ error: error.message || 'Failed to update image' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient()
    
    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('image_id')
    
    if (!imageId) {
      return NextResponse.json(
        { error: 'image_id query parameter is required' },
        { status: 400 }
      )
    }
    
    // First get the image to extract the Storage path for deletion
    const { data: image } = await supabase
      .schema('menuca_v3').from('restaurant_images')
      .select('image_url')
      .eq('id', parseInt(imageId))
      .eq('restaurant_id', parseInt(params.id))
      .single()
    
    // Delete from database
    const { error: dbError } = await supabase
      .schema('menuca_v3').from('restaurant_images')
      .delete()
      .eq('id', parseInt(imageId))
      .eq('restaurant_id', parseInt(params.id))
    
    if (dbError) throw dbError
    
    // Extract Storage path and delete from Storage if it's a Supabase URL
    // Format: /storage/v1/object/public/<bucket>/<path>
    if (image?.image_url && image.image_url.includes('supabase')) {
      try {
        const url = new URL(image.image_url)
        const pathParts = url.pathname.split('/').filter(Boolean)
        const publicIndex = pathParts.findIndex(p => p === 'public')
        
        if (publicIndex !== -1 && pathParts[publicIndex + 1]) {
          const bucket = pathParts[publicIndex + 1]
          const filePath = pathParts.slice(publicIndex + 2).join('/')
          
          const { error: storageError } = await supabase.storage.schema('menuca_v3').from(bucket).remove([filePath])
          if (storageError) {
            console.error('Failed to delete from storage:', storageError)
          }
        }
      } catch (storageError) {
        console.error('Failed to delete from storage:', storageError)
        // Continue even if storage deletion fails
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error.message || 'Failed to delete image' }, { status: 500 })
  }
}
