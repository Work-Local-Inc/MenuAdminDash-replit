import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const supabase = createAdminClient();

    // Query v_onboarding_progress_stats view
    const { data, error } = await supabase
      .schema('menuca_v3').from('v_onboarding_progress_stats')
      .select('*')
      .order('step_order');

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error fetching onboarding stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch onboarding stats' },
      { status: 500 }
    );
  }
}
