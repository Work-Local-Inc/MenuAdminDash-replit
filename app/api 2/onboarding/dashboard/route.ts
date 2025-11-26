import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const supabase = createAdminClient();

    // Call Santiago's get-onboarding-dashboard Edge Function
    const { data, error } = await supabase.functions.invoke('get-onboarding-dashboard');

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error fetching onboarding dashboard:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch onboarding dashboard' },
      { status: 500 }
    );
  }
}
