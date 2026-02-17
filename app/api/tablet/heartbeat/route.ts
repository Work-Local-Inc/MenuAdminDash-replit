import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyDeviceAuth, isAuthError } from '@/lib/tablet/verify-device'
import { heartbeatSchema } from '@/lib/validations/tablet'
import { updateDeviceHeartbeat, getDefaultDeviceConfig } from '@/lib/tablet/auth'
import type { DeviceConfig } from '@/types/tablet'
export const dynamic = 'force-dynamic'

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
      console.error(`[Device Heartbeat] Validation FAILED for device ${deviceContext.device_id}. Raw body:`, JSON.stringify(body), 'Errors:', JSON.stringify(validation.error.flatten()))
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { battery_level, printer_status, app_version, last_print_at, last_successful_fetch, consecutive_fetch_failures, oldest_pending_order_minutes } = validation.data

    // Update device heartbeat
    await updateDeviceHeartbeat(deviceContext.device_id, {
      battery_level: battery_level ?? undefined,
      printer_status: printer_status ?? undefined,
      app_version,
      last_successful_fetch: last_successful_fetch ?? undefined,
      consecutive_fetch_failures: consecutive_fetch_failures ?? undefined,
      oldest_pending_order_minutes: oldest_pending_order_minutes ?? undefined,
    })

    let configUpdate: Partial<DeviceConfig> | undefined = undefined

    try {
      const supabase = createAdminClient() as any
      const { data: deviceConfig } = await supabase
        .from('device_configs')
        .select('*')
        .eq('device_id', deviceContext.device_id)
        .single()

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
    } catch (configError) {
      console.warn(`[Device Heartbeat] Config lookup failed for device ${deviceContext.device_id}, continuing without config`)
    }

    let recoveryCommand = undefined
    try {
      const rcSupabase = createAdminClient() as any
      const { data: pendingCmd } = await rcSupabase
        .from('device_recovery_commands')
        .select('command_id, action, reason, issued_at')
        .eq('device_id', deviceContext.device_id)
        .eq('execution_status', 'pending')
        .order('issued_at', { ascending: false })
        .limit(1)
        .single()

      if (pendingCmd) {
        const cmdAge = Date.now() - new Date(pendingCmd.issued_at).getTime()
        if (cmdAge < 2 * 60 * 1000) {
          recoveryCommand = {
            id: pendingCmd.command_id,
            action: pendingCmd.action,
            reason: pendingCmd.reason,
            issued_at: pendingCmd.issued_at,
          }
        } else {
          await rcSupabase
            .from('device_recovery_commands')
            .update({ execution_status: 'expired' })
            .eq('command_id', pendingCmd.command_id)
        }
      }
    } catch (e) {
    }

    console.log(`[Device Heartbeat] Device ${deviceContext.device_id}: battery=${battery_level}%, printer=${printer_status}, app=${app_version}`)

    const response: any = {
      success: true,
      server_time: new Date().toISOString(),
      config_update: configUpdate,
    }
    if (recoveryCommand) {
      response.recovery_command = recoveryCommand
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[Device Heartbeat] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Heartbeat failed' },
      { status: 500 }
    )
  }
}
