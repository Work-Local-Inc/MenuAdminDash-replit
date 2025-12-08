import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'

// Next.js App Router Route Segment Config
// Extend timeout for file uploads
export const maxDuration = 60 // seconds
export const dynamic = 'force-dynamic'

// Whitelist of allowed storage buckets
const ALLOWED_BUCKETS = ['restaurant-logos', 'restaurant-images', 'dish-images']

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

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

export async function POST(request: NextRequest) {
  console.log('[Storage Upload] Starting upload request')
  
  try {
    // Verify auth first
    console.log('[Storage Upload] Verifying admin auth...')
    await verifyAdminAuth(request)
    console.log('[Storage Upload] Auth verified')
    
    const supabase = createAdminClient() as any
    
    // Parse form data
    console.log('[Storage Upload] Parsing form data...')
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (formError: any) {
      console.error('[Storage Upload] Failed to parse form data:', formError)
      return NextResponse.json(
        { error: `Failed to parse form data: ${formError.message}` },
        { status: 400 }
      )
    }
    
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string
    const path = formData.get('path') as string
    
    console.log('[Storage Upload] Form data:', { 
      hasFile: !!file, 
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      bucket, 
      path 
    })

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

    // Sanitize the filename in the path
    const pathParts = path.split('/')
    const filename = pathParts[pathParts.length - 1]
    const sanitizedFilename = sanitizeFilename(filename)
    pathParts[pathParts.length - 1] = sanitizedFilename
    const sanitizedPath = pathParts.join('/')

    // Convert file to buffer
    console.log('[Storage Upload] Converting file to buffer...')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('[Storage Upload] Buffer created, size:', buffer.length)

    // Upload to Supabase Storage
    console.log('[Storage Upload] Uploading to Supabase storage...', { bucket, path: sanitizedPath })
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(sanitizedPath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (error) {
      console.error('[Storage Upload] Supabase upload error:', error)
      throw error
    }
    
    console.log('[Storage Upload] Upload successful:', data)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)
    
    console.log('[Storage Upload] Public URL generated:', publicUrl)

    return NextResponse.json({ url: publicUrl, path: data.path })
  } catch (error: any) {
    console.error('[Storage Upload] Error:', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    )
  }
}
