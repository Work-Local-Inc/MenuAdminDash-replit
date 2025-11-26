import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deviceLoginSchema } from '@/lib/validations/tablet'
import {
  verifyDeviceKey,
  createDeviceSession,
  getDefaultDeviceConfig,
} from '@/lib/tablet/auth'

/**
 * POST /api/tablet/auth/login
 *
 * Authenticate a tablet device and return a session token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = deviceLoginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { device_uuid, device_key } = validation.data

    const supabase = createAdminClient()

    // Find device by UUID
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select(`
        id,
        uuid,
        device_name,
        device_key_hash,
        restaurant_id,
        is_active,
        restaurants!inner (
          id,
          name
        )
      `)
      .eq('uuid', device_uuid)
      .single()

    if (deviceError || !device) {
      console.warn('[Device Login] Device not found:', device_uuid)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if device is active
    if (!device.is_active) {
      console.warn('[Device Login] Device is inactive:', device.id)
      return NextResponse.json(
        { error: 'Device has been deactivated' },
        { status: 403 }
      )
    }

    // Check if device has a key hash (some legacy devices might not)
    if (!device.device_key_hash) {
      console.error('[Device Login] Device has no key hash:', device.id)
      return NextResponse.json(
        { error: 'Device not properly configured. Please contact support.' },
        { status: 403 }
      )
    }

    // Verify device key
    const isValidKey = await verifyDeviceKey(device_key, device.device_key_hash)
    if (!isValidKey) {
      console.warn('[Device Login] Invalid key for device:', device.id)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Create session
    const session = await createDeviceSession(device.id)

    // Update last boot time
    await supabase
      .from('devices')
      .update({ last_boot_at: new Date().toISOString() })
      .eq('id', device.id)

    // Get device config (or defaults)
    let config = getDefaultDeviceConfig()

    const { data: deviceConfig } = await supabase
      .from('device_configs')
      .select('*')
      .eq('device_id', device.id)
      .single()

    if (deviceConfig) {
      config = {
        poll_interval_ms: deviceConfig.poll_interval_ms,
        auto_print: deviceConfig.auto_print,
        sound_enabled: deviceConfig.sound_enabled,
        notification_tone: deviceConfig.notification_tone,
        print_customer_copy: deviceConfig.print_customer_copy,
        print_kitchen_copy: deviceConfig.print_kitchen_copy,
      }
    }

    const restaurant = device.restaurants as any

    console.log(`[Device Login] Device ${device.id} logged in for restaurant ${restaurant.id}`)

    return NextResponse.json({
      session_token: session.session_token,
      expires_at: session.expires_at,
      device: {
        id: device.id,
        uuid: device.uuid,
        name: device.device_name,
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
      },
      config,
    })
  } catch (error: any) {
    console.error('[Device Login] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    )
  }
}
