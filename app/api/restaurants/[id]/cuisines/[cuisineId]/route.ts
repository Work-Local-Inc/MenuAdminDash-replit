import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-check';
import { AuthError } from '@/lib/errors';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; cuisineId: string } }
) {
  try {
    await verifyAdminAuth(request);

    const restaurantId = parseInt(params.id);
    const cuisineId = parseInt(params.cuisineId);
    
    if (isNaN(restaurantId) || isNaN(cuisineId)) {
      return NextResponse.json(
        { error: 'Invalid restaurant ID or cuisine ID' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Remove cuisine assignment
    const { error } = await supabase
      .schema('menuca_v3').from('restaurant_cuisines')
      .delete()
      .eq('restaurant_id', restaurantId)
      .eq('cuisine_id', cuisineId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Cuisine removed successfully' });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error removing cuisine:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove cuisine' },
      { status: 500 }
    );
  }
}
