import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Call get_onboarding_summary SQL function
    const { data, error } = await supabase.rpc('get_onboarding_summary');

    if (error) throw error;

    return NextResponse.json(data?.[0] || null);
  } catch (error: any) {
    console.error('Error fetching onboarding summary:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch onboarding summary' },
      { status: 500 }
    );
  }
}
