import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import bcrypt from 'bcryptjs'

/**
 * POST /api/tablet/debug-device
 *
 * Debug endpoint to check device data in database
 * REMOVE AFTER DEBUGGING
 */
export async function POST(request: NextRequest) {
  try {
    const { device_uuid, device_key } = await request.json()

    const supabase = createAdminClient()

    // Fetch device from database
    const { data: device, error } = await supabase
      .from('devices')
      .select('id, uuid, device_name, device_key_hash, restaurant_id, is_active')
      .eq('uuid', device_uuid)
      .single()

    if (error || !device) {
      return NextResponse.json({
        found: false,
        error: error?.message || 'Device not found',
      })
    }

    // Check if the provided key verifies against the stored hash
    let keyVerifies = false
    let hashInfo = null

    if (device.device_key_hash) {
      keyVerifies = await bcrypt.compare(device_key, device.device_key_hash)
      hashInfo = {
        hashLength: device.device_key_hash.length,
        hashPrefix: device.device_key_hash.substring(0, 15) + '...',
        hashIsBcrypt: device.device_key_hash.startsWith('$2'),
      }
    }

    // Also test hashing the provided key to see what we get
    const newHash = await bcrypt.hash(device_key, 12)
    const selfVerify = await bcrypt.compare(device_key, newHash)

    return NextResponse.json({
      found: true,
      device: {
        id: device.id,
        uuid: device.uuid,
        name: device.device_name,
        restaurant_id: device.restaurant_id,
        is_active: device.is_active,
        hasKeyHash: !!device.device_key_hash,
      },
      providedKey: {
        length: device_key?.length,
        preview: device_key ? device_key.substring(0, 10) + '...' : null,
      },
      storedHash: hashInfo,
      verification: {
        keyVerifiesAgainstStoredHash: keyVerifies,
        selfTestPasses: selfVerify,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
