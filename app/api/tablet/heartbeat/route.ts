import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyDeviceAuth, isAuthError } from '@/lib/tablet/verify-device'
import { heartbeatSchema } from '@/lib/validations/tablet'
import { updateDeviceHeartbeat, getDefaultDeviceConfig } from '@/lib/tablet/auth'
import type { DeviceConfig } from '@/types/tablet'

/**
 * POST /api/tablet/heartbeat
 *
 * Regular health check from tablet device
 * Updates last_check_at and optionally receives config updates
 */
export async function POST(request: NextRequest) {
  try {
    // Verify device authentication
    const authResult = await verifyDeviceAuth(request)
    if (isAuthError(authResult)) {
      return authResult
    }

    const deviceContext = authResult

    // Parse and validate request body
    const body = await request.json()
    const validation = heartbeatSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { battery_level, printer_status, app_version, last_print_at } = validation.data

    // Update device heartbeat
    await updateDeviceHeartbeat(deviceContext.device_id, {
      battery_level,
      printer_status,
      app_version,
    })

    const supabase = createAdminClient()

    // Check if there's a config update for this device
    let configUpdate: Partial<DeviceConfig> | undefined = undefined

    const { data: deviceConfig } = await supabase
      .from('device_configs')
      .select('*')
      .eq('device_id', deviceContext.device_id)
      .single()

    // If device has custom config, check if we need to push an update
    // For now, we always return the config so device can sync
    if (deviceConfig) {
      configUpdate = {
        poll_interval_ms: deviceConfig.poll_interval_ms,
        auto_print: deviceConfig.auto_print,
        sound_enabled: deviceConfig.sound_enabled,
        notification_tone: deviceConfig.notification_tone,
        print_customer_copy: deviceConfig.print_customer_copy,
        print_kitchen_copy: deviceConfig.print_kitchen_copy,
      }
    }

    // Log heartbeat (useful for debugging connectivity issues)
    console.log(`[Device Heartbeat] Device ${deviceContext.device_id}: battery=${battery_level}%, printer=${printer_status}, app=${app_version}`)

    return NextResponse.json({
      success: true,
      server_time: new Date().toISOString(),
      config_update: configUpdate,
    })
  } catch (error: any) {
    console.error('[Device Heartbeat] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Heartbeat failed' },
      { status: 500 }
    )
  }
}
