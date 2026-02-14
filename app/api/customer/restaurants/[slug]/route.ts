import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractIdFromSlug } from '@/lib/utils/slugify';
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient() as any;
    const slug = params.slug;
    
    // Extract restaurant ID from slug
    const restaurantId = extractIdFromSlug(slug);
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Invalid restaurant identifier' },
        { status: 400 }
      );
    }
    
    // Fetch restaurant with nested related data
    // Try with street_address/city/province/postal_code first (direct columns on restaurants)
    let restaurant: any = null;
    let restaurantError: any = null;
    
    const baseSelect = `
        id,
        name,
        status,
        restaurant_locations (
          id,
          street_address,
          city_id,
          postal_code,
          phone,
          email,
          is_primary
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
    
    // Try with address columns on restaurants table
    const extendedResult = await supabase
      .from('restaurants')
      .select(`${baseSelect}, street_address, city, province, postal_code`)
      .eq('id', restaurantId)
      .single();
    
    if (extendedResult.error?.code === '42703') {
      // Address columns don't exist on restaurants table - fall back to base query
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
    
    return NextResponse.json(restaurant);
  } catch (error: any) {
    console.error('Error fetching restaurant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch restaurant' },
      { status: 500 }
    );
  }
}
