import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const addMenuItemSchema = z.object({
  restaurant_id: z.number(),
  name: z.string().min(1, 'Item name is required'),
  description: z.string(),
  price: z.number().min(0, 'Price must be positive'),
  category: z.string().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  ingredients: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = addMenuItemSchema.parse(body);

    const supabase = createAdminClient();

    // Call Santiago's SQL function directly
    const { data, error } = await supabase.rpc('add_menu_item_onboarding', {
      p_restaurant_id: validatedData.restaurant_id,
      p_name: validatedData.name,
      p_description: validatedData.description,
      p_price: validatedData.price,
      p_category: validatedData.category,
      p_image_url: validatedData.image_url,
      p_ingredients: validatedData.ingredients,
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Add menu item onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add menu item' },
      { status: 500 }
    );
  }
}
