import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; cuisineId: string } }
) {
  try {
    const restaurantId = parseInt(params.id);
    const cuisineId = parseInt(params.cuisineId);
    
    if (isNaN(restaurantId) || isNaN(cuisineId)) {
      return NextResponse.json(
        { error: 'Invalid restaurant ID or cuisine ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove cuisine assignment
    const { error } = await supabase
      .from('restaurant_cuisines')
      .delete()
      .eq('restaurant_id', restaurantId)
      .eq('cuisine_id', cuisineId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Cuisine removed successfully' });
  } catch (error: any) {
    console.error('Error removing cuisine:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove cuisine' },
      { status: 500 }
    );
  }
}
