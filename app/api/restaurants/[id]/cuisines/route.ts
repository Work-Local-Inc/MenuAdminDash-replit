import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const addCuisineSchema = z.object({
  cuisine_name: z.string().min(1, 'Cuisine name is required'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = parseInt(params.id);
    if (isNaN(restaurantId)) {
      return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get cuisines for the restaurant
    const { data: cuisines, error } = await supabase
      .from('restaurant_cuisines')
      .select(`
        is_primary,
        cuisine_types (
          id,
          name,
          slug
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('is_primary', { ascending: false });

    if (error) throw error;

    return NextResponse.json(cuisines || []);
  } catch (error: any) {
    console.error('Error fetching restaurant cuisines:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch cuisines' },
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
    const validatedData = addCuisineSchema.parse(body);

    const supabase = await createClient();

    // Get current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call Santiago's add-restaurant-cuisine Edge Function
    const { data, error } = await supabase.functions.invoke('add-restaurant-cuisine', {
      body: {
        restaurant_id: restaurantId,
        cuisine_name: validatedData.cuisine_name,
      },
    });

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error adding cuisine:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to add cuisine' },
      { status: 500 }
    );
  }
}
