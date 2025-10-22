import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Fetch all active cuisine types
    const { data: cuisines, error } = await supabase
      .from('cuisine_types')
      .select('id, name, slug, description, display_order')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;

    return NextResponse.json(cuisines || []);
  } catch (error: any) {
    console.error('Error fetching cuisines:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch cuisines' },
      { status: 500 }
    );
  }
}
