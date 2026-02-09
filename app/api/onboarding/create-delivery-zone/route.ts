import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAuth } from '@/lib/auth/admin-check';
import { AuthError } from '@/lib/errors';
import { z } from 'zod';
export const dynamic = 'force-dynamic'

const createDeliveryZoneSchema = z.object({
  restaurant_id: z.number(),
  zone_name: z.string().optional().nullable(),
  delivery_fee: z.number().min(0).default(2.99),
  minimum_order: z.number().min(0).default(15),
  estimated_delivery_minutes: z.number().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request);
    
    const body = await request.json();
    console.log('Create delivery zone request:', body);
    
    const validatedData = createDeliveryZoneSchema.parse(body);

    const supabase = createAdminClient() as any;

    // Get max area_number for this restaurant
    const { data: maxArea } = await supabase
      .schema('menuca_v3')
      .from('restaurant_delivery_areas')
      .select('area_number')
      .eq('restaurant_id', validatedData.restaurant_id)
      .order('area_number', { ascending: false })
      .limit(1);
    
    const nextAreaNumber = (maxArea?.[0]?.area_number || 0) + 1;

    // Insert into restaurant_delivery_areas table (per entity docs)
    const { data, error } = await supabase
      .schema('menuca_v3')
      .from('restaurant_delivery_areas')
      .insert({
        restaurant_id: validatedData.restaurant_id,
        area_number: nextAreaNumber,
        area_name: validatedData.zone_name || 'Default Zone',
        delivery_fee: validatedData.delivery_fee,
        delivery_min_order: validatedData.minimum_order,
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
