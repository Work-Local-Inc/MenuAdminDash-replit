import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dishId = parseInt(params.id);

    const supabase = await createClient() as any;
    const { data, error } = await supabase
      .from('dish_inventory')
      .select('dish_id, is_available, unavailable_until, reason, notes, updated_by_admin_id, updated_at')
      .eq('dish_id', dishId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No data found, return default values
      return NextResponse.json({
        dish_id: dishId,
        is_available: true,
        unavailable_until: null,
        reason: null,
        notes: null,
      });
    }

    if (error) {
      console.error('Error fetching dish inventory:', error);
      return NextResponse.json(
        { error: 'Failed to fetch dish inventory' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching dish inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dish inventory' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dishId = parseInt(params.id);
    const body = await request.json();

    const { is_available, unavailable_until, reason, notes } = body;

    const supabase = await createClient() as any;
    
    const upsertData = {
      dish_id: dishId,
      is_available: is_available ?? true,
      unavailable_until: unavailable_until || null,
      reason: reason || null,
      notes: notes || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('dish_inventory')
      .upsert(upsertData, { onConflict: 'dish_id' })
      .select()
      .single();

    if (error) {
      console.error('Error updating dish inventory:', error);
      return NextResponse.json(
        { error: 'Failed to update dish inventory' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating dish inventory:', error);
    return NextResponse.json(
      { error: 'Failed to update dish inventory' },
      { status: 500 }
    );
  }
}
