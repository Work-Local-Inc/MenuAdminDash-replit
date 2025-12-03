import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractIdFromSlug } from '@/lib/utils/slugify';

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
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select(`
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
          min_order_value,
          is_active,
          estimated_delivery_minutes
        ),
        delivery_and_pickup_configs (
          id,
          has_delivery_enabled,
          delivery_min_order,
          delivery_max_distance_km,
          accepts_tips
        )
      `)
      .eq('id', restaurantId)
      // No status filter - show all restaurants with menus regardless of admin status
      .single();
    
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
