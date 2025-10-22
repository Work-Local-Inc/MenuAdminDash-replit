import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '12';

    const supabase = await createClient();

    // Query featured restaurants view
    const { data, error } = await supabase
      .from('v_featured_restaurants')
      .select('*')
      .limit(parseInt(limit));

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Featured restaurants error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch featured restaurants' },
      { status: 500 }
    );
  }
}
