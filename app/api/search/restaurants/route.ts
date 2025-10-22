import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const latitude = searchParams.get('lat');
    const longitude = searchParams.get('lng');
    const radius = searchParams.get('radius') || '10';
    const limit = searchParams.get('limit') || '20';

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Build parameters
    const params: any = {
      p_search_query: query,
      p_limit: parseInt(limit),
    };

    // Add geospatial parameters if location provided
    if (latitude && longitude) {
      params.p_latitude = parseFloat(latitude);
      params.p_longitude = parseFloat(longitude);
      params.p_radius_km = parseFloat(radius);
    }

    // Call Santiago's search_restaurants SQL function
    const { data, error } = await supabase.rpc('search_restaurants', params);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Restaurant search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search restaurants' },
      { status: 500 }
    );
  }
}
