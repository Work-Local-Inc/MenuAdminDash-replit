import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-check';
import { AuthError } from '@/lib/errors';
import { createAdminClient } from '@/lib/supabase/admin';
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
    await verifyAdminAuth(request);

    const body = await request.json();
    const validatedData = createRestaurantSchema.parse(body);

    // Get the current admin user's ID from session
    const userSupabase = await createClient();
    const { data: { user } } = await userSupabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Get the admin user ID from the admin_users table
    const adminClient = createAdminClient() as any;
    const { data: adminUser, error: adminUserError } = await adminClient
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (adminUserError || !adminUser) {
      console.error('Admin user lookup error:', adminUserError);
      return NextResponse.json({ error: 'Admin user not found' }, { status: 403 });
    }

    // Create the restaurant directly in the database
    const { data: restaurant, error: restaurantError } = await adminClient
      .from('restaurants')
      .insert({
        name: validatedData.name,
        timezone: validatedData.timezone,
        status: 'pending',
        created_by: adminUser.id,
      })
      .select()
      .single();

    if (restaurantError) {
      console.error('Restaurant creation error:', restaurantError);
      return NextResponse.json({ error: restaurantError.message }, { status: 500 });
    }

    console.log('Restaurant created:', restaurant);

    // Link the admin user to the restaurant
    const { error: linkError } = await adminClient
      .from('admin_user_restaurants')
      .insert({
        admin_user_id: adminUser.id,
        restaurant_id: restaurant.id,
        role: 'owner',
      });

    if (linkError) {
      console.error('Admin-restaurant link error:', linkError);
    }

    // Create initial restaurant location (empty, to be filled during onboarding)
    const { error: locationError } = await adminClient
      .from('restaurant_locations')
      .insert({
        restaurant_id: restaurant.id,
        is_primary: true,
        is_active: true,
      });

    if (locationError) {
      console.error('Restaurant location creation error:', locationError);
    }

    // Return the created restaurant with its ID
    return NextResponse.json({
      success: true,
      restaurant_id: restaurant.id,
      message: 'Restaurant created successfully',
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
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
