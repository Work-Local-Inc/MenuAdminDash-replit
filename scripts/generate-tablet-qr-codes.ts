import { createClient } from '@supabase/supabase-js'
import { randomUUID, randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import QRCode from 'qrcode'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: 'menuca_v3' }
})

const DEVICE_KEY_LENGTH = 32
const BCRYPT_ROUNDS = 12

function generateDeviceKey(): string {
  return randomBytes(DEVICE_KEY_LENGTH).toString('base64url')
}

async function hashDeviceKey(deviceKey: string): Promise<string> {
  return bcrypt.hash(deviceKey, BCRYPT_ROUNDS)
}

function generateQRCodeData(deviceUuid: string, deviceKey: string): string {
  return `menuca://device/setup?uuid=${deviceUuid}&key=${encodeURIComponent(deviceKey)}`
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50)
}

async function main() {
  console.log('🚀 Starting bulk QR code generation for ALL restaurants...\n')

  const outputDir = path.join(process.cwd(), 'exports', 'tablet-qr-codes')
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true })
  }
  fs.mkdirSync(outputDir, { recursive: true })

  console.log('📁 Fetching all active restaurants...')
  const { data: restaurants, error: restaurantsError } = await supabase
    .from('restaurants')
    .select('id, name, slug, status')
    .eq('status', 'active')
    .order('id')

  if (restaurantsError) {
    console.error('❌ Failed to fetch restaurants:', restaurantsError)
    process.exit(1)
  }

  console.log(`✅ Found ${restaurants?.length || 0} active restaurants\n`)

  console.log('📱 Fetching existing devices...')
  const { data: existingDevices, error: devicesError } = await supabase
    .from('devices')
    .select('id, uuid, restaurant_id')

  if (devicesError) {
    console.error('❌ Failed to fetch devices:', devicesError)
    process.exit(1)
  }

  const devicesByRestaurant = new Map<number, { id: number; uuid: string }>()
  for (const d of existingDevices || []) {
    if (d.restaurant_id) {
      devicesByRestaurant.set(d.restaurant_id, { id: d.id, uuid: d.uuid })
    }
  }
  console.log(`✅ Found ${devicesByRestaurant.size} existing devices\n`)

  const csvRows: string[] = ['restaurant_id,restaurant_name,slug,device_uuid,qr_filename']
  let successCount = 0
  let errorCount = 0

  for (const restaurant of restaurants || []) {
    try {
      console.log(`Processing: ${restaurant.name} (ID: ${restaurant.id})...`)

      const existingDevice = devicesByRestaurant.get(restaurant.id)
      let deviceUuid: string
      let deviceKey: string

      if (existingDevice) {
        deviceUuid = existingDevice.uuid
        deviceKey = generateDeviceKey()
        const deviceKeyHash = await hashDeviceKey(deviceKey)

        const { error: updateError } = await supabase
          .from('devices')
          .update({
            device_key_hash: deviceKeyHash,
            is_active: true,
          })
          .eq('id', existingDevice.id)

        if (updateError) {
          console.error(`  ❌ Failed to update device: ${updateError.message}`)
          errorCount++
          continue
        }
        console.log(`  🔄 Regenerated key for existing device`)
      } else {
        deviceUuid = randomUUID()
        deviceKey = generateDeviceKey()
        const deviceKeyHash = await hashDeviceKey(deviceKey)

        const { error: deviceError } = await supabase
          .from('devices')
          .insert({
            uuid: deviceUuid,
            device_name: `Tablet - ${restaurant.name}`,
            device_key_hash: deviceKeyHash,
            restaurant_id: restaurant.id,
            has_printing_support: true,
            is_active: true,
            firmware_version: 1,
            software_version: 1,
            is_desynced: false,
            is_v2_device: false,
            allows_config_edit: true,
          })

        if (deviceError) {
          console.error(`  ❌ Failed to create device: ${deviceError.message}`)
          errorCount++
          continue
        }
        console.log(`  ✨ Created new device`)
      }

      const qrCodeData = generateQRCodeData(deviceUuid, deviceKey)
      const sanitizedName = sanitizeFilename(restaurant.name)
      const qrFilename = `${sanitizedName}_${restaurant.id}.png`
      const qrFilePath = path.join(outputDir, qrFilename)

      await QRCode.toFile(qrFilePath, qrCodeData, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'M'
      })

      const escapedName = restaurant.name.replace(/"/g, '""')
      csvRows.push(`${restaurant.id},"${escapedName}",${restaurant.slug || ''},${deviceUuid},${qrFilename}`)

      console.log(`  ✅ QR code saved: ${qrFilename}`)
      successCount++
    } catch (err: any) {
      console.error(`  ❌ Error processing ${restaurant.name}: ${err.message}`)
      errorCount++
    }
  }

  const csvPath = path.join(outputDir, 'tablet-qr-mapping.csv')
  fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf-8')

  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Successfully processed: ${successCount} restaurants`)
  console.log(`❌ Errors: ${errorCount}`)
  console.log(`📁 QR codes saved to: ${outputDir}`)
  console.log(`📄 CSV mapping file: ${csvPath}`)
  console.log('='.repeat(60))
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
