import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; tagId: string } }
) {
  try {
    const restaurantId = parseInt(params.id);
    const tagId = parseInt(params.tagId);
    
    if (isNaN(restaurantId) || isNaN(tagId)) {
      return NextResponse.json(
        { error: 'Invalid restaurant ID or tag ID' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove tag assignment
    const { error } = await supabase
      .from('restaurant_tag_assignments')
      .delete()
      .eq('restaurant_id', restaurantId)
      .eq('tag_id', tagId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Tag removed successfully' });
  } catch (error: any) {
    console.error('Error removing tag:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove tag' },
      { status: 500 }
    );
  }
}
