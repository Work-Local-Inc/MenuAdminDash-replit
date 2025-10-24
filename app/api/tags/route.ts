import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Fetch all active tags, grouped by category
    const { data: tags, error } = await supabase
      .from('restaurant_tags')
      .select('id, name, slug, category, display_order')
      .eq('is_active', true)
      .order('category, display_order');

    if (error) throw error;

    return NextResponse.json(tags || []);
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}
