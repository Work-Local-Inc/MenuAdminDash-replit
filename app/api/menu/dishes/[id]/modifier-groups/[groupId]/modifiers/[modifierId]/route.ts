import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string; modifierId: string } }
) {
  try {
    const dishId = parseInt(params.id);
    const groupId = parseInt(params.groupId);
    const modifierId = parseInt(params.modifierId);
    const body = await request.json();

    const { name, price, is_default } = body;

    const supabase = await createClient() as any;
    
    // Verify the modifier belongs to the group and the group belongs to the dish
    const { data: verifyData, error: verifyError } = await supabase
      .from('dish_modifier_items')
      .select('id, modifier_groups!inner(id, dish_id)')
      .eq('id', modifierId)
      .eq('modifier_groups.id', groupId)
      .eq('modifier_groups.dish_id', dishId)
      .single();

    if (verifyError || !verifyData) {
      return NextResponse.json(
        { error: 'Modifier not found or does not belong to this group/dish' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (name !== undefined) {
      if (!name?.trim()) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (price !== undefined && price !== null) {
      if (price < 0) {
        return NextResponse.json(
          { error: 'Price cannot be negative' },
          { status: 400 }
        );
      }
      updateData.price = price;
    }

    if (is_default !== undefined) {
      updateData.is_default = is_default;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('dish_modifier_items')
      .update(updateData)
      .eq('id', modifierId)
      .select()
      .single();

    if (error) {
      console.error('Error updating modifier:', error);
      return NextResponse.json(
        { error: 'Failed to update modifier' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating modifier:', error);
    return NextResponse.json(
      { error: 'Failed to update modifier' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string; modifierId: string } }
) {
  try {
    const dishId = parseInt(params.id);
    const groupId = parseInt(params.groupId);
    const modifierId = parseInt(params.modifierId);

    const supabase = await createClient() as any;
    
    // Verify the modifier belongs to the group and the group belongs to the dish
    const { data: verifyData, error: verifyError } = await supabase
      .from('dish_modifier_items')
      .select('id, modifier_groups!inner(id, dish_id)')
      .eq('id', modifierId)
      .eq('modifier_groups.id', groupId)
      .eq('modifier_groups.dish_id', dishId)
      .single();

    if (verifyError || !verifyData) {
      return NextResponse.json(
        { error: 'Modifier not found or does not belong to this group/dish' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('dish_modifier_items')
      .delete()
      .eq('id', modifierId);

    if (error) {
      console.error('Error deleting modifier:', error);
      return NextResponse.json(
        { error: 'Failed to delete modifier' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting modifier:', error);
    return NextResponse.json(
      { error: 'Failed to delete modifier' },
      { status: 500 }
    );
  }
}
