import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const { group_ids } = await request.json();

    if (!Array.isArray(group_ids) || group_ids.length === 0) {
      return NextResponse.json(
        { error: 'group_ids array is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify all groups belong to this dish
    const { data: verifyData, error: verifyError } = await supabase
      .from('modifier_groups')
      .select('id')
      .in('id', group_ids)
      .eq('dish_id', dishId);

    if (verifyError || !verifyData || verifyData.length !== group_ids.length) {
      return NextResponse.json(
        { error: 'Some modifier groups do not belong to this dish' },
        { status: 400 }
      );
    }

    // Perform sequential updates for atomicity
    for (let i = 0; i < group_ids.length; i++) {
      const { data, error } = await supabase
        .from('modifier_groups')
        .update({
          display_order: i,
          updated_at: new Date().toISOString()
        })
        .eq('id', group_ids[i])
        .eq('dish_id', dishId)
        .select('id');

      if (error || !data || data.length === 0) {
        console.error(`Error updating group ${group_ids[i]}:`, error);
        return NextResponse.json(
          { error: `Modifier group ${group_ids[i]} not found` },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error reordering modifier groups:', error);
    return NextResponse.json(
      { error: 'Failed to reorder modifier groups' },
      { status: 500 }
    );
  }
}
