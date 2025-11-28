import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dishId = parseInt(params.id);
    if (isNaN(dishId) || dishId <= 0) {
      return NextResponse.json(
        { error: 'Invalid dish ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient() as any;
    const { data, error } = await supabase
      .from('modifier_groups')
      .select('id, dish_id, name, display_order, is_required, min_selections, max_selections, created_at, updated_at')
      .eq('dish_id', dishId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching modifier groups:', error);
      return NextResponse.json(
        { error: 'Failed to fetch modifier groups' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching modifier groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch modifier groups' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dishId = parseInt(params.id);
    if (isNaN(dishId) || dishId <= 0) {
      return NextResponse.json(
        { error: 'Invalid dish ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, is_required, min_selections, max_selections } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient() as any;
    
    const { data: maxOrderData } = await supabase
      .from('modifier_groups')
      .select('display_order')
      .eq('dish_id', dishId)
      .order('display_order', { ascending: false })
      .limit(1);
    
    const nextOrder = (maxOrderData?.[0]?.display_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('modifier_groups')
      .insert({
        dish_id: dishId,
        name: name.trim(),
        display_order: nextOrder,
        is_required: is_required ?? false,
        min_selections: min_selections ?? 0,
        max_selections: max_selections ?? 999
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating modifier group:', error);
      return NextResponse.json(
        { error: 'Failed to create modifier group' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating modifier group:', error);
    return NextResponse.json(
      { error: 'Failed to create modifier group' },
      { status: 500 }
    );
  }
}
