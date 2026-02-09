import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractIdFromSlug } from '@/lib/utils/slugify';
import { getDeliveryProviderConfig, getDeliveryProviderAdapter } from '@/lib/delivery-providers';
export const dynamic = 'force-dynamic'

/**
 * GET /api/customer/restaurants/[slug]/delivery-fee
 *
 * Get delivery fee based on distance for RestoZone restaurants.
 * For non-RestoZone restaurants, returns zone-based fee.
 *
 * Query params:
 * - lat: Customer latitude
 * - lng: Customer longitude
 * - distance: Distance in km (optional, calculated if lat/lng provided)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const distanceParam = searchParams.get('distance');
    const slug = params.slug;

    // Extract restaurant ID from slug
    const restaurantId = extractIdFromSlug(slug);
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Invalid restaurant identifier' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient() as any;

    // Get restaurant config and location
    const { data: config, error: configError } = await supabase
      .schema('menuca_v3')
      .from('delivery_and_pickup_configs')
      .select('has_delivery_enabled, distance_based_delivery_fee')
      .eq('restaurant_id', restaurantId)
      .single();

    if (configError) {
      console.error('[Delivery Fee] Config error:', configError);
      return NextResponse.json(
        { error: 'Restaurant config not found' },
        { status: 404 }
      );
    }

    if (!config.has_delivery_enabled) {
      return NextResponse.json({
        deliveryAvailable: false,
        error: 'Delivery not available for this restaurant',
      });
    }

    // Get restaurant location for distance calculation
    const { data: location, error: locationError } = await supabase
      .schema('menuca_v3')
      .from('restaurant_locations')
      .select('lat, lng')
      .eq('restaurant_id', restaurantId)
      .single();

    if (locationError) {
      console.error('[Delivery Fee] Location error:', locationError);
    }

    // Calculate distance if lat/lng provided
    let distanceKm: number | null = null;

    if (distanceParam) {
      distanceKm = parseFloat(distanceParam);
    } else if (lat && lng && location?.lat && location?.lng) {
      const customerLat = parseFloat(lat);
      const customerLng = parseFloat(lng);
      if (!isNaN(customerLat) && !isNaN(customerLng)) {
        distanceKm = calculateDistance(
          location.lat,
          location.lng,
          customerLat,
          customerLng
        );
      }
    }

    // For distance-based restaurants, we need coordinates to calculate fee
    if (config.distance_based_delivery_fee) {
      // Check if we have the required coordinates
      if (distanceKm === null) {
        // Missing coordinates - can't calculate fee for distance-based restaurant
        if (!lat || !lng) {
          return NextResponse.json({
            deliveryAvailable: true,
            isDistanceBased: true,
            error: 'Customer coordinates required for distance-based delivery fee',
            message: 'Provide lat and lng query parameters to calculate delivery fee',
          }, { status: 400 });
        }
        
        if (!location?.lat || !location?.lng) {
          console.error(`[Delivery Fee] Restaurant ${restaurantId} is distance-based but has no location coordinates`);
          return NextResponse.json({
            deliveryAvailable: false,
            isDistanceBased: true,
            error: 'Restaurant location not configured - unable to calculate delivery fee',
          }, { status: 500 });
        }
      }
    }

    // For distance-based restaurants, use delivery provider API or fallback fee tiers
    if (config.distance_based_delivery_fee && distanceKm !== null) {
      const roundedDistance = Math.ceil(distanceKm);

      // Check if this restaurant uses an external delivery provider
      const providerConfig = await getDeliveryProviderConfig(restaurantId);
      
      if (providerConfig?.provider && providerConfig.provider.isActive && 
          providerConfig.provider.supportsFeeApi && providerConfig.providerExternalId) {
        
        const adapter = getDeliveryProviderAdapter(providerConfig.provider.code);
        
        if (adapter) {
          console.log(`[Delivery Fee] Checking ${providerConfig.provider.name} for restaurant ${restaurantId}, distance: ${roundedDistance}km`);

          // Try provider API first
          const feeResult = await adapter.getFee({
            restaurantId,
            providerExternalId: providerConfig.providerExternalId,
            distanceKm: roundedDistance,
          });

          if (feeResult.success && feeResult.fee !== null) {
            console.log(`[Delivery Fee] ${providerConfig.provider.name} returned fee: $${feeResult.fee}`);
            return NextResponse.json({
              deliveryAvailable: true,
              deliveryFee: feeResult.fee,
              distanceKm: roundedDistance,
              source: `${providerConfig.provider.code}_api`,
              isDistanceBased: true,
            });
          } else {
            console.log(`[Delivery Fee] ${providerConfig.provider.name} API failed, using fallback:`, feeResult.error);
          }
        }
      }

      // Fallback: Use existing distance-based fee tiers from database
      const { data: feeTiers, error: feeTiersError } = await supabase
        .schema('menuca_v3')
        .from('restaurant_distance_based_delivery_fees')
        .select('distance_in_km, total_delivery_fee, driver_earning')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('distance_in_km', { ascending: true });

      if (!feeTiersError && feeTiers && feeTiers.length > 0) {
        // Find the fee tier for this distance
        const matchingTier = feeTiers.find(
          (tier: any) => tier.distance_in_km >= roundedDistance
        );

        if (matchingTier) {
          return NextResponse.json({
            deliveryAvailable: true,
            deliveryFee: matchingTier.total_delivery_fee,
            driverEarning: matchingTier.driver_earning,
            distanceKm: roundedDistance,
            source: 'distance_based_tiers',
            isDistanceBased: true,
          });
        } else {
          // Distance exceeds max tier - use highest tier
          const maxTier = feeTiers[feeTiers.length - 1];
          return NextResponse.json({
            deliveryAvailable: true,
            deliveryFee: maxTier.total_delivery_fee,
            driverEarning: maxTier.driver_earning,
            distanceKm: roundedDistance,
            source: 'distance_based_tiers',
            isDistanceBased: true,
            warning: 'Distance exceeds configured tiers, using maximum fee',
          });
        }
      }
    }

    // For zone-based restaurants (or if distance calculation fails), 
    // return zone info and let client handle point-in-polygon
    const { data: zones, error: zonesError } = await supabase
      .schema('menuca_v3')
      .from('restaurant_delivery_areas')
      .select('id, delivery_fee, delivery_min_order, is_active, geometry')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    if (zonesError) {
      console.error('[Delivery Fee] Zones error:', zonesError);
      return NextResponse.json(
        { error: 'Failed to fetch delivery zones' },
        { status: 500 }
      );
    }

    // If we have lat/lng, check which zone contains the point
    let matchedZone = null;
    if (lat && lng && zones && zones.length > 0) {
      const customerLat = parseFloat(lat);
      const customerLng = parseFloat(lng);
      
      if (!isNaN(customerLat) && !isNaN(customerLng)) {
        const { isPointInGeoJSON } = await import('@/lib/utils/point-in-polygon');
        const point: [number, number] = [customerLng, customerLat];

        for (const zone of zones) {
          if (zone.geometry && isPointInGeoJSON(point, zone.geometry)) {
            matchedZone = zone;
            break;
          }
        }
      }
    }

    if (matchedZone) {
      return NextResponse.json({
        deliveryAvailable: true,
        deliveryFee: matchedZone.delivery_fee || 0,
        minOrder: matchedZone.delivery_min_order || 0,
        distanceKm: distanceKm ? Math.round(distanceKm * 10) / 10 : null,
        source: 'zone_based',
        isDistanceBased: false,
      });
    }

    // No zone matched or no coordinates provided
    return NextResponse.json({
      deliveryAvailable: zones && zones.length > 0,
      zones: zones?.map((z: any) => ({
        id: z.id,
        deliveryFee: z.delivery_fee,
        minOrder: z.delivery_min_order,
      })) || [],
      distanceKm: distanceKm ? Math.round(distanceKm * 10) / 10 : null,
      source: zones && zones.length > 0 ? 'zone_based' : 'none',
      isDistanceBased: config.distance_based_delivery_fee,
      message: lat && lng ? 'Address is outside delivery zone' : 'Provide lat/lng to check delivery availability',
    });

  } catch (error: any) {
    console.error('[Delivery Fee] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate delivery fee' },
      { status: 500 }
    );
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
