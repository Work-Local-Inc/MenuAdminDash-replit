import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { extractIdFromSlug, createRestaurantSlug } from '@/lib/utils/slugify';
import RestaurantMenu from '@/components/customer/restaurant-menu-public';
import type { RestaurantMenuResponse } from '@/lib/types/menu';
import { hexToHSL, hasCustomBranding } from '@/lib/utils';

const DEFAULT_PRIMARY_COLOR = '#DC2626';

interface RestaurantPageProps {
  params: {
    slug: string;
  };
}

interface RestaurantRecord {
  id: number;
  name: string;
  banner_image_url: string | null;
  logo_url: string | null;
  logo_display_mode: 'icon_text' | 'full_logo' | null;
  show_order_online_badge: boolean | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
  menu_layout: string | null;
  button_style: string | null;
  price_color: string | null;
  checkout_button_color: string | null;
  image_card_description_lines: '2' | '3' | null;
  restaurant_delivery_areas?: { id: number; delivery_fee: number | null; delivery_min_order: number | null; is_active: boolean; estimated_delivery_minutes: number | null }[] | null;
  restaurant_locations?: { id: number; street_address: string | null; postal_code: string | null; phone: string | null }[] | null;
}

const getRestaurant = async (restaurantId: number) => {
  noStore(); // Disable caching to always fetch fresh branding settings
  const supabase = await createClient();
  
  // Base query fields (always available)
  const baseFields = `
    id,
    name,
    banner_image_url,
    logo_url,
    logo_display_mode,
    primary_color,
    secondary_color,
    font_family,
    menu_layout,
    button_style,
    price_color,
    checkout_button_color,
    restaurant_delivery_areas(id, delivery_fee, delivery_min_order, is_active, estimated_delivery_minutes),
    restaurant_locations(id, street_address, postal_code, phone)
  `;
  
  // Try with all optional columns first
  let { data, error } = await supabase
    .from('restaurants')
    .select(`${baseFields}, show_order_online_badge, image_card_description_lines`)
    .eq('id', restaurantId)
    .single<RestaurantRecord>();

  // If a column doesn't exist (42703), fall back to base query
  if (error?.code === '42703') {
    console.log('[Restaurant Page] Optional column not found, retrying with base fields only');
    const result = await supabase
      .from('restaurants')
      .select(baseFields)
      .eq('id', restaurantId)
      .single<RestaurantRecord>();
    
    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error('[Restaurant Page] Failed to load restaurant:', error);
    return null;
  }

  return data;
};

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
  
  // Build dynamic branding styles - use default warm color if restaurant has no custom color
  const effectivePrimaryColor = restaurant.primary_color || DEFAULT_PRIMARY_COLOR;
  const primaryColorHSL = hexToHSL(effectivePrimaryColor);
  const secondaryColorHSL = restaurant.secondary_color ? hexToHSL(restaurant.secondary_color) : null;
  
  // Only apply custom font if restaurant has custom branding (not using defaults)
  const useCustomFont = hasCustomBranding(restaurant) && restaurant.font_family;
  
  const dynamicStyle: React.CSSProperties = {
    '--primary': primaryColorHSL,
    '--ring': primaryColorHSL,
    ...(secondaryColorHSL && {
      '--secondary': secondaryColorHSL,
    }),
    ...(useCustomFont && {
      fontFamily: restaurant.font_family,
    }),
  } as React.CSSProperties;
  
  return (
    <div style={dynamicStyle}>
      <RestaurantMenu restaurant={restaurant} courses={courses} slug={params.slug} />
    </div>
  );
}
