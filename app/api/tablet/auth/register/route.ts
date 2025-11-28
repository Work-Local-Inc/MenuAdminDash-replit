import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { deviceRegisterSchema } from '@/lib/validations/tablet'
import {
  generateDeviceKey,
  hashDeviceKey,
  generateQRCodeData,
} from '@/lib/tablet/auth'

/**
 * POST /api/tablet/auth/register
 *
 * Register a new tablet device (admin-only)
 * Creates device record and returns one-time device key
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Only admins can register devices
    await verifyAdminAuth(request)

    const body = await request.json()

    // Validate input
    const validation = deviceRegisterSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { device_name, restaurant_id, has_printing_support } = validation.data

    const supabase = createAdminClient() as any

    // Verify restaurant exists
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurant_id)
      .single()

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    // Generate device credentials
    const deviceUuid = randomUUID()
    const deviceKey = generateDeviceKey()
    const deviceKeyHash = await hashDeviceKey(deviceKey)

    // Create device record
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .insert({
        uuid: deviceUuid,
        device_name,
        device_key_hash: deviceKeyHash,
        restaurant_id,
        has_printing_support: has_printing_support ?? true,
        is_active: true,
        firmware_version: 1,
        software_version: 1,
        is_desynced: false,
        is_v2_device: false,
        allows_config_edit: true,
      })
      .select('id, uuid, device_name, restaurant_id')
      .single()

    if (deviceError) {
      console.error('[Device Register] Failed to create device:', deviceError)
      return NextResponse.json(
        { error: 'Failed to create device', details: deviceError.message },
        { status: 500 }
      )
    }

    // Generate QR code data for easy setup
    const qrCodeData = generateQRCodeData(deviceUuid, deviceKey)

    console.log(`[Device Register] Created device ${device.id} for restaurant ${restaurant_id}`)

    return NextResponse.json({
      device_id: device.id,
      device_uuid: device.uuid,
      device_key: deviceKey, // IMPORTANT: This is shown ONCE. Store securely!
      qr_code_data: qrCodeData,
      message: 'Device registered successfully. Save the device key - it cannot be retrieved later!',
    })
  } catch (error: any) {
    console.error('[Device Register] Error:', error)

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to register device' },
      { status: 500 }
    )
  }
}
