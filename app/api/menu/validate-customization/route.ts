import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { dish_id, selected_modifiers } = body;
    
    if (!dish_id) {
      return NextResponse.json(
        { error: 'dish_id is required' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .schema('menuca_v3')
      .rpc('validate_dish_customization', {
        p_dish_id: dish_id,
        p_selected_modifiers: selected_modifiers || []
      });
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error validating customization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate customization' },
      { status: 500 }
    );
  }
}
