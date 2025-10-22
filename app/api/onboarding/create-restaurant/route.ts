import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createRestaurantSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required'),
  timezone: z.string().default('America/Toronto'),
  parent_restaurant_id: z.number().optional().nullable(),
  is_franchise_parent: z.boolean().default(false),
  franchise_brand_name: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createRestaurantSchema.parse(body);

    const supabase = await createClient();

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call Santiago's create-restaurant-onboarding Edge Function
    const { data, error } = await supabase.functions.invoke('create-restaurant-onboarding', {
      body: validatedData,
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Create restaurant onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create restaurant' },
      { status: 500 }
    );
  }
}
