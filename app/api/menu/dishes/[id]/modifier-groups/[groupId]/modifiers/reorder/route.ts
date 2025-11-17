import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string } }
) {
  try {
    const groupId = parseInt(params.groupId);
    const { modifier_ids } = await request.json();

    if (!Array.isArray(modifier_ids) || modifier_ids.length === 0) {
      return NextResponse.json(
        { error: 'modifier_ids array is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Perform sequential updates for atomicity
    for (let i = 0; i < modifier_ids.length; i++) {
      const { error } = await supabase
        .schema('menuca_v3').from('dish_modifier_items')
        .update({
          display_order: i,
          updated_at: new Date().toISOString()
        })
        .eq('id', modifier_ids[i])
        .eq('modifier_group_id', groupId);

      if (error) {
        console.error(`Error updating modifier ${modifier_ids[i]}:`, error);
        return NextResponse.json(
          { error: 'Failed to reorder modifiers' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error reordering modifiers:', error);
    return NextResponse.json(
      { error: 'Failed to reorder modifiers' },
      { status: 500 }
    );
  }
}
