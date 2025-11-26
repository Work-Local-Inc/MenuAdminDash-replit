import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { extractIdFromSlug, createRestaurantSlug } from '@/lib/utils/slugify';
import RestaurantMenu from '@/components/customer/restaurant-menu-public';
import type { RestaurantMenuResponse } from '@/lib/types/menu';
import { hexToHSL } from '@/lib/utils';

interface RestaurantPageProps {
  params: {
    slug: string;
  };
}

interface RestaurantRecord {
  id: number;
  name: string;
  banner_image_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
  restaurant_delivery_zones?: { id: number; delivery_fee_cents: number; is_active: boolean; deleted_at: string | null }[] | null;
  restaurant_service_configs?: { id: number; delivery_min_order: number | null }[] | null;
  restaurant_locations?: { id: number; street_address: string | null; postal_code: string | null }[] | null;
}

const getRestaurant = cache(async (restaurantId: number) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      id,
      name,
      banner_image_url,
      primary_color,
      secondary_color,
      font_family,
      restaurant_delivery_zones(id, delivery_fee_cents, is_active, deleted_at),
      restaurant_service_configs(id, delivery_min_order),
      restaurant_locations(id, street_address, postal_code)
    `)
    .eq('id', restaurantId)
    .single<RestaurantRecord>();

  if (error) {
    console.error('[Restaurant Page] Failed to load restaurant:', error);
    return null;
  }

  return data;
});

export async function generateMetadata({ params }: RestaurantPageProps): Promise<Metadata> {
  const restaurantId = extractIdFromSlug(params.slug);
  
  if (!restaurantId) {
    return {
      title: 'Restaurant Not Found | Menu.ca',
    };
  }

  const restaurant = await getRestaurant(restaurantId);

  if (!restaurant) {
    return {
      title: 'Restaurant Not Found | Menu.ca',
    };
  }
  
  return {
    title: `${restaurant.name} | Menu.ca`,
    description: `Order food online from ${restaurant.name}. Browse our menu and get delivery or takeout.`,
  };
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
  const supabase = await createClient();
  const restaurantId = extractIdFromSlug(params.slug);
  
  console.log('[Restaurant Page] Slug:', params.slug, 'Restaurant ID:', restaurantId);
  
  if (!restaurantId) {
    console.log('[Restaurant Page] No restaurant ID found - redirecting to homepage');
    redirect('/');
  }
  
  const restaurant = await getRestaurant(restaurantId);

  if (!restaurant) {
    console.log('[Restaurant Page] No restaurant found - redirecting to homepage');
    redirect('/');
  }
  
  // Redirect to correct slug if needed
  const correctSlug = createRestaurantSlug(restaurant.id, restaurant.name);
  if (params.slug !== correctSlug) {
    redirect(`/r/${correctSlug}`);
  }
  
  // Fetch menu using get_restaurant_menu SQL function
  const { data: menuData, error: menuError } = await (supabase as any)
    .rpc('get_restaurant_menu', {
      p_restaurant_id: restaurantId,
      p_language_code: 'en'
    });
  
  console.log('[Restaurant Page] Menu RPC result:', { 
    menuData, 
    menuError,
    coursesCount: menuData?.courses?.length,
    totalDishes: menuData?.courses?.reduce((sum: number, c: any) => sum + (c.dishes?.length || 0), 0)
  });
  
  // DEBUG: Log first dish structure
  if (menuData?.courses?.[0]?.dishes?.[0]) {
    console.log('[Restaurant Page] Sample dish structure:', JSON.stringify(menuData.courses[0].dishes[0], null, 2));
  }
  
  // Extract courses from menu response
  const courses = (menuData as RestaurantMenuResponse)?.courses || [];
  
  console.log('[Restaurant Page] About to render RestaurantMenu component with courses:', courses.length);
  
  // Build dynamic branding styles
  const primaryColorHSL = restaurant.primary_color ? hexToHSL(restaurant.primary_color) : null;
  const secondaryColorHSL = restaurant.secondary_color ? hexToHSL(restaurant.secondary_color) : null;
  
  const dynamicStyle: React.CSSProperties = {
    ...(primaryColorHSL && {
      '--primary': primaryColorHSL,
      '--ring': primaryColorHSL,
    }),
    ...(secondaryColorHSL && {
      '--secondary': secondaryColorHSL,
    }),
    ...(restaurant.font_family && {
      fontFamily: restaurant.font_family,
    }),
  } as React.CSSProperties;
  
  return (
    <div style={Object.keys(dynamicStyle).length > 0 ? dynamicStyle : undefined}>
      <RestaurantMenu restaurant={restaurant} courses={courses} />
    </div>
  );
}
