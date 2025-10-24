import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)

    const supabase = createAdminClient();

    // Fetch all active cuisine types
    const { data: cuisines, error } = await supabase
      .from('cuisine_types')
      .select('id, name, slug, description, display_order')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;

    return NextResponse.json(cuisines || []);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error fetching cuisines:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch cuisines' },
      { status: 500 }
    );
  }
}
