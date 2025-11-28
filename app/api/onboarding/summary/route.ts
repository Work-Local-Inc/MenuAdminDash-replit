import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const supabase = createAdminClient() as any;

    // Call get_onboarding_summary SQL function
    const { data, error } = await supabase.rpc('get_onboarding_summary');

    if (error) throw error;

    return NextResponse.json(data?.[0] || null);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error fetching onboarding summary:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch onboarding summary' },
      { status: 500 }
    );
  }
}
