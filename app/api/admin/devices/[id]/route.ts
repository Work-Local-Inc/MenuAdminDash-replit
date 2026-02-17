import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/devices/[id]
 *
 * Get single device details (admin-only)
 */
export async function GET(
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

    const supabase = createAdminClient() as any

    const { data: device, error } = await supabase
      .from('devices')
      .select(`
        *,
        restaurants (
          id,
          name
        ),
        device_configs (
          poll_interval_ms,
          auto_print,
          sound_enabled,
          notification_tone,
          print_customer_copy,
          print_kitchen_copy
        )
      `)
      .eq('id', deviceId)
      .single()

    if (error || !device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      )
    }

    const deviceObj = device as any
    const now = Date.now()
    const lastCheckAt = deviceObj.last_check_at ? new Date(deviceObj.last_check_at).getTime() : null
    const lastSuccessfulFetch = deviceObj.last_successful_fetch ? new Date(deviceObj.last_successful_fetch).getTime() : null
    const consecutiveFailures = deviceObj.consecutive_fetch_failures ?? 0
    const oldestPending = deviceObj.oldest_pending_order_minutes ?? 0

    let health_status: 'healthy' | 'warning' | 'critical' | 'offline' | 'unknown' = 'healthy'
    if (lastCheckAt === null) {
      health_status = 'unknown'
    } else if (now - lastCheckAt > 2 * 60 * 1000) {
      health_status = 'offline'
    } else if (
      (lastSuccessfulFetch !== null && now - lastSuccessfulFetch > 5 * 60 * 1000) ||
      consecutiveFailures >= 3 ||
      oldestPending >= 5
    ) {
      health_status = 'critical'
    } else if (lastSuccessfulFetch !== null && now - lastSuccessfulFetch > 2 * 60 * 1000) {
      health_status = 'warning'
    }

    return NextResponse.json({
      ...deviceObj,
      restaurant_name: deviceObj.restaurants?.name || null,
      config: deviceObj.device_configs || null,
      last_successful_fetch: deviceObj.last_successful_fetch ?? null,
      consecutive_fetch_failures: consecutiveFailures,
      oldest_pending_order_minutes: oldestPending,
      battery_level: deviceObj.battery_level ?? null,
      printer_status: deviceObj.printer_status ?? null,
      app_version: deviceObj.app_version ?? 'unknown',
      health_status,
      is_online: lastCheckAt !== null && now - lastCheckAt < 2 * 60 * 1000,
    })
  } catch (error: any) {
    console.error('[Admin Device Detail] Error:', error)

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch device' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/devices/[id]
 *
 * Update device (admin-only)
 */
export async function PATCH(
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

    const body = await request.json()
    const { is_active, device_name, restaurant_id, has_printing_support } = body

    const supabase = createAdminClient() as any

    // Build update object
    const updateData: Record<string, any> = {}

    if (is_active !== undefined) updateData.is_active = is_active
    if (device_name !== undefined) updateData.device_name = device_name
    if (restaurant_id !== undefined) updateData.restaurant_id = restaurant_id
    if (has_printing_support !== undefined) updateData.has_printing_support = has_printing_support

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data: device, error } = await supabase
      .from('devices')
      .update(updateData)
      .eq('id', deviceId)
      .select()
      .single()

    if (error) {
      console.error('[Admin Device Update] Error:', error)
      return NextResponse.json(
        { error: 'Failed to update device' },
        { status: 500 }
      )
    }

    console.log(`[Admin Device Update] Device ${deviceId} updated:`, updateData)

    return NextResponse.json(device)
  } catch (error: any) {
    console.error('[Admin Device Update] Error:', error)

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update device' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/devices/[id]
 *
 * Delete device (admin-only)
 */
export async function DELETE(
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

    const supabase = createAdminClient() as any

    // Delete associated sessions first
    await supabase
      .from('device_sessions')
      .delete()
      .eq('device_id', deviceId)

    // Delete associated config
    await supabase
      .from('device_configs')
      .delete()
      .eq('device_id', deviceId)

    // Delete the device
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', deviceId)

    if (error) {
      console.error('[Admin Device Delete] Error:', error)
      return NextResponse.json(
        { error: 'Failed to delete device' },
        { status: 500 }
      )
    }

    console.log(`[Admin Device Delete] Device ${deviceId} deleted`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Admin Device Delete] Error:', error)

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete device' },
      { status: 500 }
    )
  }
}
