import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractIdFromSlug } from '@/lib/utils/slugify';
import { fetchMenuForCustomer, validateLanguageCode } from '@/lib/supabase/menu';
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient() as any;
    const slug = params.slug;
    
    const restaurantId = extractIdFromSlug(slug);
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Invalid restaurant identifier' },
        { status: 400 }
      );
    }
    
    const rawLanguage = request.nextUrl.searchParams.get('language') || 'en';
    const language = validateLanguageCode(rawLanguage);
    
    const { data, error } = await fetchMenuForCustomer(
      supabase,
      restaurantId,
      language
    );
    
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
