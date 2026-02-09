import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPointInGeoJSON } from '@/lib/utils/point-in-polygon'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const restaurantId = searchParams.get('restaurantId')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient() as any
    const parsedRestaurantId = parseInt(restaurantId)

    if (isNaN(parsedRestaurantId)) {
      return NextResponse.json(
        { error: 'Invalid restaurant ID' },
        { status: 400 }
      )
    }

    // Query restaurant_delivery_areas table (per entity docs, this is the delivery zones table)
    const { data: areasData, error: areasError } = await supabase
      .schema('menuca_v3')
      .from('restaurant_delivery_areas')
      .select('*')
      .eq('restaurant_id', parsedRestaurantId)
      .is('deleted_at', null)
      .order('area_number', { ascending: true })

    if (areasError) {
      console.error('[Validate Delivery] Error fetching delivery areas:', areasError)
      return NextResponse.json(
        { error: 'Failed to fetch delivery areas', details: areasError.message },
        { status: 500 }
      )
    }

    // Transform from restaurant_delivery_areas schema to frontend format
    const zones: Array<{ id: number; restaurant_id: number; name: string; delivery_fee: number; min_order: number | null; polygon: any; is_active: boolean }> = (areasData || []).map((area: any) => ({
      id: area.id,
      restaurant_id: area.restaurant_id,
      name: area.area_name || `Delivery Zone ${area.area_number || area.id}`,
      delivery_fee: area.delivery_fee || 0,
      min_order: area.delivery_min_order || null,
      polygon: area.geometry || null,
      is_active: area.is_active ?? true,
    }))

    const activeZones = zones.filter(z => z.is_active)

    let matchedZone = null
    let isWithinDeliveryArea = false

    if (lat && lng) {
      const latitude = parseFloat(lat)
      const longitude = parseFloat(lng)

      if (!isNaN(latitude) && !isNaN(longitude)) {
        const point: [number, number] = [longitude, latitude]

        for (const zone of activeZones) {
          if (!zone.polygon) continue

          if (isPointInGeoJSON(point, zone.polygon)) {
            matchedZone = zone
            isWithinDeliveryArea = true
            break
          }
        }
      }
    }

    return NextResponse.json({
      zones: activeZones,
      matchedZone,
      isWithinDeliveryArea,
      hasDeliveryZones: activeZones.length > 0,
    })

  } catch (error: any) {
    console.error('[Validate Delivery] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to validate delivery' },
      { status: 500 }
    )
  }
}
