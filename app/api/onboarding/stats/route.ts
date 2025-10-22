import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Query v_onboarding_progress_stats view
    const { data, error } = await supabase
      .from('v_onboarding_progress_stats')
      .select('*')
      .order('step_order');

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching onboarding stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch onboarding stats' },
      { status: 500 }
    );
  }
}
