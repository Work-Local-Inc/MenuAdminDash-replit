import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAuth } from '@/lib/auth/admin-check';
import { AuthError } from '@/lib/errors';
import { z } from 'zod';

const addLocationSchema = z.object({
  restaurant_id: z.number(),
  street_address: z.string().min(1, 'Street address is required'),
  city_id: z.number(),
  province_id: z.number(),
  postal_code: z.string().min(1, 'Postal code is required'),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
});

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request);
    
    const body = await request.json();
    console.log('Add location request body:', body);
    
    const validatedData = addLocationSchema.parse(body);

    const supabase = createAdminClient() as any;

    // First check if a location already exists for this restaurant
    const { data: existingLocation } = await supabase
      .from('restaurant_locations')
      .select('id')
      .eq('restaurant_id', validatedData.restaurant_id)
      .eq('is_primary', true)
      .single();

    let result;
    
    if (existingLocation) {
      // Update existing location
      const { data, error } = await supabase
        .from('restaurant_locations')
        .update({
          street_address: validatedData.street_address,
          city_id: validatedData.city_id,
          province_id: validatedData.province_id,
          postal_code: validatedData.postal_code,
          latitude: validatedData.latitude || null,
          longitude: validatedData.longitude || null,
          phone: validatedData.phone || null,
          email: validatedData.email || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLocation.id)
        .select()
        .single();
      
      if (error) {
        console.error('Location update error:', error);
        throw error;
      }
      result = data;
    } else {
      // Create new location
      const { data, error } = await supabase
        .from('restaurant_locations')
        .insert({
          restaurant_id: validatedData.restaurant_id,
          street_address: validatedData.street_address,
          city_id: validatedData.city_id,
          province_id: validatedData.province_id,
          postal_code: validatedData.postal_code,
          latitude: validatedData.latitude || null,
          longitude: validatedData.longitude || null,
          phone: validatedData.phone || null,
          email: validatedData.email || null,
          is_primary: true,
          is_active: true,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Location insert error:', error);
        throw error;
      }
      result = data;
    }

    // Also update restaurant_contacts if phone/email provided
    if (validatedData.phone || validatedData.email) {
      const { error: contactError } = await supabase
        .from('restaurant_contacts')
        .upsert({
          restaurant_id: validatedData.restaurant_id,
          phone: validatedData.phone || null,
          email: validatedData.email || null,
        }, {
          onConflict: 'restaurant_id'
        });
      
      if (contactError) {
        console.error('Contact upsert error (non-fatal):', contactError);
      }
    }

    return NextResponse.json({
      success: true,
      location: result,
      message: 'Location saved successfully',
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Add location onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add location' },
      { status: 500 }
    );
  }
}
