import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { extractIdFromSlug, createRestaurantSlug } from '@/lib/utils/slugify';
import RestaurantMenu from '@/components/customer/restaurant-menu';

interface RestaurantPageProps {
  params: {
    slug: string;
  };
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
  const supabase = await createClient();
  const restaurantId = extractIdFromSlug(params.slug);
  
  if (!restaurantId) {
    notFound();
  }
  
  // Fetch restaurant details
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
      restaurant_service_configs (
        id,
        has_delivery_enabled,
        delivery_time_minutes,
        delivery_min_order,
        delivery_max_distance_km,
        takeout_enabled,
        takeout_time_minutes,
        accepts_tips
      )
    `)
    .eq('id', restaurantId)
    .eq('status', 'active')
    .single();
  
  if (restaurantError || !restaurant) {
    notFound();
  }
  
  // Fetch menu with courses and dishes
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select(`
      id,
      name,
      description,
      display_order,
      dishes (
        id,
        name,
        description,
        base_price,
        image_url,
        has_customization,
        is_active,
        prices,
        size_options
      )
    `)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  
  if (coursesError) {
    console.error('Error fetching menu:', coursesError);
    throw new Error('Failed to load restaurant menu');
  }
  
  // Filter active dishes
  const menuCourses = (courses || []).map(course => ({
    ...course,
    dishes: (course.dishes || []).filter((dish: any) => dish.is_active),
  })).filter(course => course.dishes.length > 0);
  
  // If no menu data, show appropriate message
  const hasMenu = menuCourses.length > 0;
  
  return (
    <RestaurantMenu 
      restaurant={restaurant}
      courses={menuCourses}
      hasMenu={hasMenu}
    />
  );
}
