import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { extractIdFromSlug, createRestaurantSlug } from '@/lib/utils/slugify';
import RestaurantMenu from '@/components/customer/restaurant-menu';

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
    .single();
  
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
    console.log('[Restaurant Page] No restaurant ID found');
    notFound();
  }
  
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();
  
  console.log('[Restaurant Page] Query result:', { restaurant, error: restaurantError });
  
  if (!restaurant) {
    console.log('[Restaurant Page] No restaurant found - calling not Found()');
    notFound();
  }
  
  // Redirect to correct slug if needed
  const correctSlug = createRestaurantSlug(restaurant.id, restaurant.name);
  if (params.slug !== correctSlug) {
    redirect(`/r/${correctSlug}`);
  }
  
  // Fetch menu categories and dishes
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select(`
      *,
      dishes!dishes_course_id_fkey!inner (*)
    `)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .eq('dishes.is_active', true)
    .order('display_order', { ascending: true });
  
  console.log('[Restaurant Page] Courses query result:', { courses, coursesError });
  console.log('[Restaurant Page] About to render RestaurantMenu component');
  
  return <RestaurantMenu restaurant={restaurant} courses={courses || []} />;
}
