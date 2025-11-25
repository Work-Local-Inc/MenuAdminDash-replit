import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminAuth } from '@/lib/auth/admin-check';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request);
    
    const restaurantId = parseInt(params.id, 10);
    if (isNaN(restaurantId)) {
      return NextResponse.json(
        { error: 'Invalid restaurant ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current verified status
    const { data: restaurant, error: fetchError } = await supabase
      .from('restaurants')
      .select('verified')
      .eq('id', restaurantId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Toggle the verified status
    const newVerifiedStatus = !restaurant.verified;
    
    const { data, error: updateError } = await supabase
      .from('restaurants')
      .update({ verified: newVerifiedStatus })
      .eq('id', restaurantId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      verified: newVerifiedStatus,
      restaurant: data
    });

  } catch (error: any) {
    console.error('Toggle verified error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle verified status' },
      { status: 500 }
    );
  }
}
