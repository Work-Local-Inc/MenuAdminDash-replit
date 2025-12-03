import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAuth } from '@/lib/auth/admin-check';
import { AuthError } from '@/lib/errors';
import { z } from 'zod';

const addMenuItemSchema = z.object({
  restaurant_id: z.number(),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional().nullable(),
  price: z.number().min(0, 'Price must be positive'),
  category: z.string().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  ingredients: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request);
    
    const body = await request.json();
    console.log('Add menu item request:', body);
    
    const validatedData = addMenuItemSchema.parse(body);

    const supabase = createAdminClient() as any;

    // First, get or create a default course/category for the restaurant
    let courseId;
    const categoryName = validatedData.category || 'Main Menu';
    
    const { data: existingCourse } = await supabase
      .from('courses')
      .select('id')
      .eq('restaurant_id', validatedData.restaurant_id)
      .eq('name', categoryName)
      .single();

    if (existingCourse) {
      courseId = existingCourse.id;
    } else {
      // Create the course
      const { data: newCourse, error: courseError } = await supabase
        .from('courses')
        .insert({
          restaurant_id: validatedData.restaurant_id,
          name: categoryName,
          is_active: true,
          display_order: 0,
        })
        .select()
        .single();

      if (courseError) {
        console.error('Course creation error:', courseError);
        throw courseError;
      }
      courseId = newCourse.id;
    }

    // Create the dish
    const { data: dish, error: dishError } = await supabase
      .from('dishes')
      .insert({
        restaurant_id: validatedData.restaurant_id,
        course_id: courseId,
        name: validatedData.name,
        description: validatedData.description || null,
        base_price: validatedData.price,
        image_url: validatedData.image_url || null,
        ingredients: validatedData.ingredients || null,
        is_active: true,
        display_order: 0,
      })
      .select()
      .single();

    if (dishError) {
      console.error('Dish creation error:', dishError);
      throw dishError;
    }

    // Create price variant
    const { error: priceError } = await supabase
      .from('dish_prices')
      .insert({
        dish_id: dish.id,
        price: validatedData.price,
        display_order: 0,
      });

    if (priceError) {
      console.error('Price creation error (non-fatal):', priceError);
    }

    return NextResponse.json({
      success: true,
      dish,
      message: 'Menu item added successfully',
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Add menu item onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add menu item' },
      { status: 500 }
    );
  }
}
