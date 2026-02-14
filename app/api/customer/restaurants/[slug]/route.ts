import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractIdFromSlug } from '@/lib/utils/slugify';
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createAdminClient() as any;
    const slug = params.slug;
    
    const restaurantId = extractIdFromSlug(slug);
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Invalid restaurant identifier' },
        { status: 400 }
      );
    }
    
    const baseSelect = `
        id,
        name,
        status,
        restaurant_locations (
          id,
          street_address,
          city_id,
          province_id,
          postal_code,
          phone,
          email,
          is_primary,
          is_active
        ),
        restaurant_schedules (
          id,
          type,
          day_start,
          day_stop,
          time_start,
          time_stop,
          is_enabled
        ),
        restaurant_delivery_areas (
          id,
          delivery_fee,
          delivery_min_order,
          is_active,
          estimated_delivery_minutes
        ),
        delivery_and_pickup_configs (
          id,
          has_delivery_enabled,
          pickup_enabled
        )
    `;
    
    let restaurant: any = null;
    let restaurantError: any = null;
    
    const extendedResult = await supabase
      .from('restaurants')
      .select(`${baseSelect}, street_address, city, province, postal_code`)
      .eq('id', restaurantId)
      .single();
    
    if (extendedResult.error?.code === '42703') {
      const baseResult = await supabase
        .from('restaurants')
        .select(baseSelect)
        .eq('id', restaurantId)
        .single();
      restaurant = baseResult.data;
      restaurantError = baseResult.error;
    } else {
      restaurant = extendedResult.data;
      restaurantError = extendedResult.error;
    }
    
    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }
    
    if (restaurant.restaurant_locations?.length > 0) {
      const cityIds = [...new Set(restaurant.restaurant_locations.map((l: any) => l.city_id).filter(Boolean))];
      const provinceIds = [...new Set(restaurant.restaurant_locations.map((l: any) => l.province_id).filter(Boolean))];
      
      const [citiesResult, provincesResult] = await Promise.all([
        cityIds.length > 0
          ? supabase.from('cities').select('id, name').in('id', cityIds)
          : { data: [] },
        provinceIds.length > 0
          ? supabase.from('provinces').select('id, name').in('id', provinceIds)
          : { data: [] },
      ]);
      
      const cityMap = new Map((citiesResult.data || []).map((c: any) => [c.id, c.name]));
      const provinceMap = new Map((provincesResult.data || []).map((p: any) => [p.id, p.name]));
      
      restaurant.restaurant_locations = restaurant.restaurant_locations.map((loc: any) => ({
        ...loc,
        city_name: cityMap.get(loc.city_id) || null,
        province_name: provinceMap.get(loc.province_id) || null,
      }));
    }
    
    return NextResponse.json(restaurant);
  } catch (error: any) {
    console.error('Error fetching restaurant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch restaurant' },
      { status: 500 }
    );
  }
}
