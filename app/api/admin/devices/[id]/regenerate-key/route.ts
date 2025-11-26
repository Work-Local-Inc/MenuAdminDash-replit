import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { generateDeviceKey, hashDeviceKey, generateQRCodeData } from '@/lib/tablet/auth'

/**
 * POST /api/admin/devices/[id]/regenerate-key
 *
 * Regenerate device key (admin-only)
 * This invalidates the old key and creates a new one
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdminAuth(request)

    const { id } = await params
    const deviceId = parseInt(id)

    if (isNaN(deviceId)) {
      return NextResponse.json(
        { error: 'Invalid device ID' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get device first to verify it exists and get UUID
    const { data: device, error: fetchError } = await supabase
      .from('devices')
      .select('id, uuid, device_name')
      .eq('id', deviceId)
      .single()

    if (fetchError || !device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      )
    }

    // Generate new credentials
    const newDeviceKey = generateDeviceKey()
    const newKeyHash = await hashDeviceKey(newDeviceKey)

    // Update device with new key hash
    const { error: updateError } = await supabase
      .from('devices')
      .update({ device_key_hash: newKeyHash })
      .eq('id', deviceId)

    if (updateError) {
      console.error('[Admin Device Regenerate Key] Error:', updateError)
      return NextResponse.json(
        { error: 'Failed to regenerate key' },
        { status: 500 }
      )
    }

    // Invalidate all existing sessions for this device
    await supabase
      .from('device_sessions')
      .delete()
      .eq('device_id', deviceId)

    // Generate QR code data
    const qrCodeData = generateQRCodeData(device.uuid, newDeviceKey)

    console.log(`[Admin Device Regenerate Key] Device ${deviceId} key regenerated`)

    return NextResponse.json({
      device_id: device.id,
      device_uuid: device.uuid,
      device_key: newDeviceKey,
      qr_code_data: qrCodeData,
      message: 'Device key regenerated. Save the new key - it cannot be retrieved later!',
    })
  } catch (error: any) {
    console.error('[Admin Device Regenerate Key] Error:', error)

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to regenerate key' },
      { status: 500 }
    )
  }
}
