import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractIdFromSlug } from '@/lib/utils/slugify';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient();
    const slug = params.slug;
    
    const restaurantId = extractIdFromSlug(slug);
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Invalid restaurant identifier' },
        { status: 400 }
      );
    }
    
    const language = request.nextUrl.searchParams.get('language') || 'en';
    
    const { data, error } = await supabase
      .schema('menuca_v3')
      .rpc('get_restaurant_menu', {
        p_restaurant_id: restaurantId,
        p_language_code: language
      });
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      return NextResponse.json({ restaurant_id: restaurantId, courses: [] });
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching menu:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch menu' },
      { status: 500 }
    );
  }
}
