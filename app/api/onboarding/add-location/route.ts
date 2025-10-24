import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const addLocationSchema = z.object({
  restaurant_id: z.number(),
  street_address: z.string().min(1, 'Street address is required'),
  city_id: z.number(),
  province_id: z.number(),
  postal_code: z.string().min(1, 'Postal code is required'),
  latitude: z.number(),
  longitude: z.number(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = addLocationSchema.parse(body);

    const supabase = createAdminClient();

    // Call Santiago's SQL function directly
    const { data, error } = await supabase.rpc('add_restaurant_location_onboarding', {
      p_restaurant_id: validatedData.restaurant_id,
      p_street_address: validatedData.street_address,
      p_city_id: validatedData.city_id,
      p_province_id: validatedData.province_id,
      p_postal_code: validatedData.postal_code,
      p_latitude: validatedData.latitude,
      p_longitude: validatedData.longitude,
      p_phone: validatedData.phone,
      p_email: validatedData.email,
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Add location onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add location' },
      { status: 500 }
    );
  }
}
