import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET_NAME = 'email-assets'

async function uploadEmailAssets() {
  console.log('🚀 Uploading email assets to Supabase storage...\n')

  // Create bucket if it doesn't exist
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME)

  if (!bucketExists) {
    console.log(`📦 Creating bucket: ${BUCKET_NAME}`)
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    })
    if (error) {
      console.error('Failed to create bucket:', error)
      return
    }
  }

  const files = [
    { local: 'public/email-assets/logo.png', remote: 'logo.png', contentType: 'image/png' },
    { local: 'public/email-assets/hero-bg.jpg', remote: 'hero-bg.jpg', contentType: 'image/jpeg' },
  ]

  for (const file of files) {
    const filePath = path.resolve(file.local)
    const fileBuffer = fs.readFileSync(filePath)

    console.log(`⬆️  Uploading: ${file.remote}`)
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(file.remote, fileBuffer, {
        contentType: file.contentType,
        upsert: true,
      })

    if (error) {
      console.error(`❌ Failed to upload ${file.remote}:`, error)
    } else {
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(file.remote)
      console.log(`✅ Uploaded: ${urlData.publicUrl}`)
    }
  }

  console.log('\n✨ Upload complete!')
}

uploadEmailAssets().catch(console.error)
