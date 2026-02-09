import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/auth/admin-check';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/promotions/templates
 * List available promotion templates
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const { adminUser } = await verifyAdminAuth(request);
    
    const supabase = await createClient() as any;

    const { data: templates, error } = await supabase
      .from('promotion_templates')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ templates });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Templates GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

