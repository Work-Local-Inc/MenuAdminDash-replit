import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string } }
) {
  try {
    const dishId = parseInt(params.id);
    const groupId = parseInt(params.groupId);
    
    if (isNaN(dishId) || dishId <= 0 || isNaN(groupId) || groupId <= 0) {
      return NextResponse.json(
        { error: 'Invalid dish ID or group ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const { name, is_required, min_selections, max_selections } = body;

    // Validate min/max relationship
    const finalMin = min_selections !== undefined ? min_selections : null;
    const finalMax = max_selections !== undefined ? max_selections : null;
    
    if (finalMin !== null && finalMax !== null && finalMin > finalMax) {
      return NextResponse.json(
        { error: 'min_selections cannot be greater than max_selections' },
        { status: 400 }
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

    if (is_required !== undefined) {
      updateData.is_required = is_required;
    }

    if (min_selections !== undefined) {
      updateData.min_selections = min_selections;
    }

    if (max_selections !== undefined) {
      updateData.max_selections = max_selections;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updateData.updated_at = new Date().toISOString();

    const supabase = await createClient() as any;
    const { data, error } = await supabase
      .from('modifier_groups')
      .update(updateData)
      .eq('id', groupId)
      .eq('dish_id', dishId)
      .select()
      .single();

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Modifier group not found or does not belong to this dish' },
          { status: 404 }
        );
      }
      console.error('Error updating modifier group:', error);
      return NextResponse.json(
        { error: 'Failed to update modifier group' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating modifier group:', error);
    return NextResponse.json(
      { error: 'Failed to update modifier group' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string } }
) {
  try {
    const dishId = parseInt(params.id);
    const groupId = parseInt(params.groupId);
    
    if (isNaN(dishId) || dishId <= 0 || isNaN(groupId) || groupId <= 0) {
      return NextResponse.json(
        { error: 'Invalid dish ID or group ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient() as any;
    const { data, error } = await supabase
      .from('modifier_groups')
      .delete()
      .eq('id', groupId)
      .eq('dish_id', dishId)
      .select('id');

    if (error || !data || data.length === 0) {
      if (error?.code === 'PGRST116' || !data || data.length === 0) {
        return NextResponse.json(
          { error: 'Modifier group not found or does not belong to this dish' },
          { status: 404 }
        );
      }
      console.error('Error deleting modifier group:', error);
      return NextResponse.json(
        { error: 'Failed to delete modifier group' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting modifier group:', error);
    return NextResponse.json(
      { error: 'Failed to delete modifier group' },
      { status: 500 }
    );
  }
}
