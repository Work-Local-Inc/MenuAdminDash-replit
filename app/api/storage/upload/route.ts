import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'

// Whitelist of allowed storage buckets
const ALLOWED_BUCKETS = ['restaurant-logos', 'restaurant-images']

// Allowed file types (MIME types)
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
]

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    
    const supabase = createAdminClient()
    
    const formData = await request.formData()
    
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string
    const path = formData.get('path') as string

    if (!file || !bucket || !path) {
      return NextResponse.json(
        { error: 'Missing required fields: file, bucket, or path' },
        { status: 400 }
      )
    }

    // Validate bucket is whitelisted
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json(
        { error: `Bucket '${bucket}' is not allowed. Allowed buckets: ${ALLOWED_BUCKETS.join(', ')}` },
        { status: 403 }
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type '${file.type}' is not allowed. Allowed types: images only` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Validate path format (should start with a number - restaurant ID)
    if (!/^\d+\//.test(path)) {
      return NextResponse.json(
        { error: 'Invalid path format. Path must start with restaurant ID' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.schema('menuca_v3').from(arrayBuffer)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .schema('menuca_v3').from(bucket)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .schema('menuca_v3').from(bucket)
      .getPublicUrl(data.path)

    return NextResponse.json({ url: publicUrl, path: data.path })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    )
  }
}
