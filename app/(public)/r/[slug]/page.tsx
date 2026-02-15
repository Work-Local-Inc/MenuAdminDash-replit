import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractIdFromSlug, createRestaurantSlug } from '@/lib/utils/slugify';
import RestaurantMenu from '@/components/customer/restaurant-menu-public';
import { AnalyticsProvider } from '@/components/providers/analytics-provider';
import { LanguageProvider } from '@/lib/contexts/language-context';
import type { RestaurantMenuResponse } from '@/lib/types/menu';
import { hexToHSL, hasCustomBranding } from '@/lib/utils';
import { fetchMenuForCustomer } from '@/lib/supabase/menu';

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
  banner_is_ai_generated: boolean | null;
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
  restaurant_locations?: { id: number; street_address: string | null; city_id: number | null; province_id: number | null; postal_code: string | null; phone: string | null; is_primary: boolean | null; is_active: boolean | null; city_name?: string | null; province_name?: string | null }[] | null;
}

const getRestaurant = async (restaurantId: number) => {
  noStore();
  const supabase = createAdminClient() as any;
  
  const baseFields = `
    id,
    name,
    banner_image_url,
    banner_is_ai_generated,
    logo_url,
    logo_display_mode,
    primary_color,
    secondary_color,
    font_family,
    menu_layout,
    button_style,
    price_color,
    checkout_button_color,
    image_card_description_lines,
    restaurant_delivery_areas(id, delivery_fee, delivery_min_order, is_active, estimated_delivery_minutes),
    restaurant_locations(id, street_address, city_id, province_id, postal_code, phone, is_primary, is_active)
  `;
  
  let { data, error } = await supabase
    .from('restaurants')
    .select(`${baseFields}, show_order_online_badge`)
    .eq('id', restaurantId)
    .single();

  if (error?.code === '42703' && error.message?.includes('show_order_online_badge')) {
    const result = await supabase
      .from('restaurants')
      .select(baseFields)
      .eq('id', restaurantId)
      .single();
    
    data = result.data;
    error = result.error;
  }
  
  if (error?.code === '42703' && error.message?.includes('image_card_description_lines')) {
    const baseWithoutDescLines = `
      id, name, banner_image_url, banner_is_ai_generated, logo_url, logo_display_mode,
      primary_color, secondary_color, font_family, menu_layout, button_style,
      price_color, checkout_button_color,
      restaurant_delivery_areas(id, delivery_fee, delivery_min_order, is_active, estimated_delivery_minutes),
      restaurant_locations(id, street_address, city_id, province_id, postal_code, phone, is_primary, is_active)
    `;
    const result = await supabase
      .from('restaurants')
      .select(baseWithoutDescLines)
      .eq('id', restaurantId)
      .single();
    
    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error('[Restaurant Page] Failed to load restaurant:', error);
    return null;
  }

  if (data?.restaurant_locations?.length > 0) {
    const cityIds = [...new Set(data.restaurant_locations.map((l: any) => l.city_id).filter(Boolean))];
    const provinceIds = [...new Set(data.restaurant_locations.map((l: any) => l.province_id).filter(Boolean))];
    
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
    
    data.restaurant_locations = data.restaurant_locations.map((loc: any) => ({
      ...loc,
      city_name: cityMap.get(loc.city_id) || null,
      province_name: provinceMap.get(loc.province_id) || null,
    }));
  }

  return data;
};

const getAnalyticsConfig = async (restaurantId: number): Promise<string | null> => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await (adminClient as any)
      .schema('menuca_v3')
      .from('restaurant_analytics_configs')
      .select('ga_measurement_id, is_enabled')
      .eq('restaurant_id', restaurantId)
      .eq('is_enabled', true)
      .single();
    
    if (error || !data) {
      return null;
    }
    return data.ga_measurement_id || null;
  } catch {
    return null;
  }
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
  
  // Redirect to correct slug if needed (but skip if this is a subdomain rewrite)
  const headersList = headers();
  const isSubdomainRewrite = headersList.get('x-subdomain-rewrite') === 'true';
  
  if (!isSubdomainRewrite) {
    const correctSlug = createRestaurantSlug(restaurant.id, restaurant.name);
    if (params.slug !== correctSlug) {
      redirect(`/r/${correctSlug}`);
    }
  }
  
  // Fetch menu using cached get_restaurant_menu SQL function (250x faster)
  const { data: menuData, error: menuError } = await fetchMenuForCustomer(
    supabase,
    restaurantId,
    'en'
  );
  
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
  
  // Fetch analytics config (non-blocking, returns null if not configured)
  const gaMeasurementId = await getAnalyticsConfig(restaurantId);
  
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
    <LanguageProvider>
      <AnalyticsProvider measurementId={gaMeasurementId}>
        <div style={dynamicStyle}>
          <RestaurantMenu restaurant={restaurant} courses={courses} slug={params.slug} gaMeasurementId={gaMeasurementId} />
        </div>
      </AnalyticsProvider>
    </LanguageProvider>
  );
}
