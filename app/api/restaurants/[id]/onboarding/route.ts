import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Call Santiago's get-restaurant-onboarding Edge Function
    const { data, error } = await supabase.functions.invoke('get-restaurant-onboarding', {
      body: { restaurant_id: restaurantId },
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching onboarding status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch onboarding status' },
      { status: 500 }
    );
  }
}
