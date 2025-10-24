import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const addTagSchema = z.object({
  tag_name: z.string().min(1, 'Tag name is required'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Re-enable auth after admin_users table is created
    // await verifyAdminAuth(request)

    const restaurantId = parseInt(params.id);
    if (isNaN(restaurantId)) {
      return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get tags for the restaurant
    const { data: tags, error } = await supabase
      .from('restaurant_tag_assignments')
      .select(`
        restaurant_tags (
          id,
          name,
          slug,
          category
        )
      `)
      .eq('restaurant_id', restaurantId);

    if (error) throw error;

    return NextResponse.json(tags || []);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error fetching restaurant tags:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = parseInt(params.id);
    if (isNaN(restaurantId)) {
      return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = addTagSchema.parse(body);

    const supabase = createAdminClient();

    // Get current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call Santiago's add-restaurant-tag Edge Function
    const { data, error } = await supabase.functions.invoke('add-restaurant-tag', {
      body: {
        restaurant_id: restaurantId,
        tag_name: validatedData.tag_name,
      },
    });

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error adding tag:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to add tag' },
      { status: 500 }
    );
  }
}
