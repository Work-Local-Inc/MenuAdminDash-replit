import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    const body = await request.json();
    const validatedData = createDeliveryZoneSchema.parse(body);

    const supabase = await createClient();

    // Call Santiago's SQL function directly
    const { data, error } = await supabase.rpc('create_delivery_zone_onboarding', {
      p_restaurant_id: validatedData.restaurant_id,
      p_zone_name: validatedData.zone_name,
      p_center_latitude: validatedData.center_latitude,
      p_center_longitude: validatedData.center_longitude,
      p_radius_meters: validatedData.radius_meters,
      p_delivery_fee_cents: validatedData.delivery_fee_cents,
      p_minimum_order_cents: validatedData.minimum_order_cents,
      p_estimated_delivery_minutes: validatedData.estimated_delivery_minutes,
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Create delivery zone onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create delivery zone' },
      { status: 500 }
    );
  }
}
