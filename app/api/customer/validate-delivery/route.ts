import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPointInGeoJSON } from '@/lib/utils/point-in-polygon'

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

    const { data: areasData, error: areasError } = await supabase
      .schema('menuca_v3')
      .from('restaurant_delivery_areas')
      .select('*')
      .eq('restaurant_id', parsedRestaurantId)
      .order('id', { ascending: true })

    if (areasError) {
      console.error('[Validate Delivery] Error fetching delivery areas:', areasError)
      return NextResponse.json(
        { error: 'Failed to fetch delivery areas', details: areasError.message },
        { status: 500 }
      )
    }

    const { data: zonesData, error: zonesError } = await supabase
      .schema('menuca_v3')
      .from('restaurant_delivery_zones')
      .select('id, restaurant_id, zone_name, delivery_fee_cents, minimum_order_cents, zone_geometry, is_active, created_at')
      .eq('restaurant_id', parsedRestaurantId)
      .is('deleted_at', null)
      .order('id', { ascending: true })

    if (zonesError) {
      console.error('[Validate Delivery] Error fetching delivery zones:', zonesError)
      return NextResponse.json(
        { error: 'Failed to fetch delivery zones', details: zonesError.message },
        { status: 500 }
      )
    }

    const useAreasTable = (areasData?.length || 0) > 0
    const useZonesTable = !useAreasTable && (zonesData?.length || 0) > 0

    let zones: any[] = []

    if (useZonesTable && zonesData) {
      zones = zonesData.map((zone: any) => ({
        id: zone.id,
        restaurant_id: zone.restaurant_id,
        name: zone.zone_name,
        delivery_fee: (zone.delivery_fee_cents || 0) / 100,
        min_order: zone.minimum_order_cents !== null ? zone.minimum_order_cents / 100 : null,
        polygon: zone.zone_geometry,
        is_active: zone.is_active ?? true,
      }))
    } else if (useAreasTable && areasData) {
      zones = areasData.map((area: any) => ({
        id: area.id,
        restaurant_id: area.restaurant_id,
        name: area.display_name || area.area_name || `Delivery Zone ${area.area_number || area.id}`,
        delivery_fee: area.delivery_fee || 0,
        min_order: area.min_order_value || null,
        polygon: area.geometry || null,
        is_active: area.is_active ?? true,
      }))
    }

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
