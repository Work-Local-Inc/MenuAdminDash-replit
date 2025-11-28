import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string } }
) {
  try {
    const groupId = parseInt(params.groupId);

    const supabase = await createClient() as any;
    const { data, error } = await supabase
      .from('dish_modifier_items')
      .select('id, modifier_group_id, name, price, is_default, display_order, created_at, updated_at')
      .eq('modifier_group_id', groupId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching modifiers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch modifiers' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching modifiers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch modifiers' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string } }
) {
  try {
    const groupId = parseInt(params.groupId);
    const body = await request.json();

    const { name, price, is_default } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (price === undefined || price === null) {
      return NextResponse.json(
        { error: 'Price is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient() as any;
    
    const { data: maxOrderData } = await supabase
      .from('dish_modifier_items')
      .select('display_order')
      .eq('modifier_group_id', groupId)
      .order('display_order', { ascending: false })
      .limit(1);
    
    const nextOrder = (maxOrderData?.[0]?.display_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('dish_modifier_items')
      .insert({
        modifier_group_id: groupId,
        name: name.trim(),
        price,
        is_default: is_default ?? false,
        display_order: nextOrder
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating modifier:', error);
      return NextResponse.json(
        { error: 'Failed to create modifier' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating modifier:', error);
    return NextResponse.json(
      { error: 'Failed to create modifier' },
      { status: 500 }
    );
  }
}
