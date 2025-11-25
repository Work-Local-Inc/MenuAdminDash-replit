import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const seoSchema = z.object({
  meta_title: z.string().max(60, 'Meta title should be 60 characters or less').nullable().optional(),
  meta_description: z.string().max(160, 'Meta description should be 160 characters or less').nullable().optional(),
  og_title: z.string().max(60, 'OG title should be 60 characters or less').nullable().optional(),
  og_description: z.string().max(160, 'OG description should be 160 characters or less').nullable().optional(),
  og_image_url: z.string().url('Must be a valid URL').nullable().optional(),
  include_in_sitemap: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)

    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from('restaurant_seo')
      .select('*')
      .eq('restaurant_id', parseInt(params.id))
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error
    }
    
    return NextResponse.json(data || null)
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch SEO data' }, { status: 500 })
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
    
    // Ensure at least one field is provided to prevent accidental data wipe
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'Request body cannot be empty. Provide at least one SEO field to update.' },
        { status: 400 }
      )
    }
    
    // Validate request body server-side
    const validatedData = seoSchema.parse(body)
    
    // Ensure we have at least one non-undefined field after validation
    const hasValidData = Object.values(validatedData).some(val => val !== undefined)
    if (!hasValidData) {
      return NextResponse.json(
        { error: 'At least one SEO field must be provided' },
        { status: 400 }
      )
    }
    
    // Fetch existing SEO data to merge with updates (prevents overwriting unmodified fields)
    const { data: existingData } = await supabase
      .from('restaurant_seo')
      .select('*')
      .eq('restaurant_id', parseInt(params.id))
      .single()
    
    // Merge: only update fields that were explicitly provided in the request
    const mergedData = {
      restaurant_id: parseInt(params.id),
      meta_title: validatedData.meta_title !== undefined ? validatedData.meta_title : (existingData?.meta_title ?? null),
      meta_description: validatedData.meta_description !== undefined ? validatedData.meta_description : (existingData?.meta_description ?? null),
      og_title: validatedData.og_title !== undefined ? validatedData.og_title : (existingData?.og_title ?? null),
      og_description: validatedData.og_description !== undefined ? validatedData.og_description : (existingData?.og_description ?? null),
      og_image_url: validatedData.og_image_url !== undefined ? validatedData.og_image_url : (existingData?.og_image_url ?? null),
      include_in_sitemap: validatedData.include_in_sitemap !== undefined ? validatedData.include_in_sitemap : (existingData?.include_in_sitemap ?? true),
      updated_at: new Date().toISOString(),
    }
    
    const { data, error } = await supabase
      .from('restaurant_seo')
      .upsert(mergedData)
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
    return NextResponse.json({ error: error.message || 'Failed to save SEO data' }, { status: 500 })
  }
}
