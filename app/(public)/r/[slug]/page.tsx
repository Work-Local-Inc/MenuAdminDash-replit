import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { extractIdFromSlug, createRestaurantSlug } from '@/lib/utils/slugify';
import RestaurantMenu from '@/components/customer/restaurant-menu';
import type { RestaurantMenuResponse } from '@/lib/types/menu';
import { hexToHSL } from '@/lib/utils';

interface RestaurantPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: RestaurantPageProps): Promise<Metadata> {
  const supabase = await createClient();
  const restaurantId = extractIdFromSlug(params.slug);
  
  if (!restaurantId) {
    return {
      title: 'Restaurant Not Found | Menu.ca',
    };
  }
  
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('id', restaurantId)
    .single<{ id: number; name: string }>();
  
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
  
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single<any>();
  
  console.log('[Restaurant Page] Query result:', { restaurant, error: restaurantError });
  
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
  
  // Convert primary color to HSL for CSS variable injection
  const primaryColorHSL = restaurant.primary_color ? hexToHSL(restaurant.primary_color) : null;
  const dynamicStyle = primaryColorHSL ? {
    '--primary': primaryColorHSL,
    '--ring': primaryColorHSL,
  } as React.CSSProperties : undefined;
  
  return (
    <div style={dynamicStyle}>
      <RestaurantMenu restaurant={restaurant} courses={courses} />
    </div>
  );
}
