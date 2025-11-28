import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as any;
    const body = await request.json();
    
    const { dish_id, size_code, modifiers } = body;
    
    if (!dish_id) {
      return NextResponse.json(
        { error: 'dish_id is required' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .schema('menuca_v3')
      .rpc('calculate_dish_price', {
        p_dish_id: dish_id,
        p_size_code: size_code || 'default',
        p_modifiers: modifiers || []
      });
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error calculating price:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate price' },
      { status: 500 }
    );
  }
}
