import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const dishId = parseInt(params.id, 10);
    
    if (isNaN(dishId)) {
      return NextResponse.json(
        { error: 'Invalid dish ID' },
        { status: 400 }
      );
    }
    
    // Fetch modifiers for the dish
    const { data: modifiers, error } = await supabase
      .schema('menuca_v3').from('dish_modifiers')
      .select('id, name, price, is_required, display_order')
      .eq('dish_id', dishId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(modifiers || []);
  } catch (error: any) {
    console.error('Error fetching dish modifiers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch modifiers' },
      { status: 500 }
    );
  }
}
