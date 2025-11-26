import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'

/**
 * GET /api/admin/devices
 *
 * List all devices (admin-only)
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')
    const isActive = searchParams.get('is_active')

    const supabase = createAdminClient()

    let query = supabase
      .from('devices')
      .select(`
        id,
        uuid,
        device_name,
        restaurant_id,
        has_printing_support,
        is_active,
        last_check_at,
        last_boot_at,
        firmware_version,
        software_version,
        created_at,
        restaurants (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (restaurantId) {
      query = query.eq('restaurant_id', parseInt(restaurantId))
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data: devices, error } = await query

    if (error) {
      console.error('[Admin Devices] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch devices' },
        { status: 500 }
      )
    }

    // Transform to include restaurant name
    const transformedDevices = (devices || []).map((device: any) => ({
      id: device.id,
      uuid: device.uuid,
      device_name: device.device_name,
      restaurant_id: device.restaurant_id,
      restaurant_name: device.restaurants?.name || null,
      has_printing_support: device.has_printing_support,
      is_active: device.is_active,
      last_check_at: device.last_check_at,
      last_boot_at: device.last_boot_at,
      firmware_version: device.firmware_version,
      software_version: device.software_version,
      created_at: device.created_at,
      // Calculate online status (active within last 2 minutes)
      is_online: device.last_check_at
        ? new Date(device.last_check_at) > new Date(Date.now() - 2 * 60 * 1000)
        : false,
    }))

    return NextResponse.json(transformedDevices)
  } catch (error: any) {
    console.error('[Admin Devices] Error:', error)

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch devices' },
      { status: 500 }
    )
  }
}
