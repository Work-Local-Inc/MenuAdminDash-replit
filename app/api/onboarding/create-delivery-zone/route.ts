import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAuth } from '@/lib/auth/admin-check';
import { AuthError } from '@/lib/errors';
import { z } from 'zod';

const createDeliveryZoneSchema = z.object({
  restaurant_id: z.number(),
  zone_name: z.string().optional().nullable(),
  center_latitude: z.number().optional().nullable(),
  center_longitude: z.number().optional().nullable(),
  radius_meters: z.number().min(500).max(50000).optional().nullable(),
  delivery_fee_cents: z.number().min(0).default(299),
  minimum_order_cents: z.number().min(0).default(1500),
  estimated_delivery_minutes: z.number().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request);
    
    const body = await request.json();
    console.log('Create delivery zone request:', body);
    
    const validatedData = createDeliveryZoneSchema.parse(body);

    const supabase = createAdminClient() as any;

    // Insert into restaurant_delivery_zones table
    const { data, error } = await supabase
      .from('restaurant_delivery_zones')
      .insert({
        restaurant_id: validatedData.restaurant_id,
        zone_name: validatedData.zone_name || 'Default Zone',
        center_latitude: validatedData.center_latitude,
        center_longitude: validatedData.center_longitude,
        radius_meters: validatedData.radius_meters || 5000,
        delivery_fee_cents: validatedData.delivery_fee_cents,
        minimum_order_cents: validatedData.minimum_order_cents,
        estimated_delivery_minutes: validatedData.estimated_delivery_minutes || 45,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Delivery zone insert error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      delivery_zone: data,
      message: 'Delivery zone created successfully',
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Create delivery zone onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create delivery zone' },
      { status: 500 }
    );
  }
}
