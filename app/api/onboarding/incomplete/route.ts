import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)

    const supabase = createAdminClient();

    const { searchParams } = new URL(request.url);
    const minDays = parseInt(searchParams.get('minDays') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Query v_incomplete_onboarding_restaurants view
    let query = supabase
      .schema('menuca_v3').from('v_incomplete_onboarding_restaurants')
      .select('*')
      .order('days_in_onboarding', { ascending: false })
      .order('completion_percentage', { ascending: false });

    if (minDays > 0) {
      query = query.gte('days_in_onboarding', minDays);
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error fetching incomplete restaurants:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch incomplete restaurants' },
      { status: 500 }
    );
  }
}
