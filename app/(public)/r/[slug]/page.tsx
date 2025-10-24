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
  
  if (!restaurantId) {
    notFound();
  }
  
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();
  
  if (!restaurant) {
    notFound();
  }
  
  // Redirect to correct slug if needed
  const correctSlug = createRestaurantSlug(restaurant.id, restaurant.name);
  if (params.slug !== correctSlug) {
    redirect(`/r/${correctSlug}`);
  }
  
  return <RestaurantMenu restaurant={restaurant} />;
}
