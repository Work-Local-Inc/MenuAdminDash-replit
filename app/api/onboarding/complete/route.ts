import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-check';
import { AuthError } from '@/lib/errors';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const completeOnboardingSchema = z.object({
  restaurant_id: z.number(),
  notes: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request);

    const body = await request.json();
    console.log('Complete onboarding request:', body);
    
    const validatedData = completeOnboardingSchema.parse(body);

    const supabase = createAdminClient() as any;

    // Update restaurant status to active
    const { data: restaurant, error: updateError } = await supabase
      .from('restaurants')
      .update({
        status: 'active',
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', validatedData.restaurant_id)
      .select()
      .single();

    if (updateError) {
      console.error('Restaurant activation error:', updateError);
      throw updateError;
    }

    // Update or create onboarding record if it exists
    const { error: onboardingError } = await supabase
      .from('restaurant_onboarding')
      .upsert({
        restaurant_id: validatedData.restaurant_id,
        completed_at: new Date().toISOString(),
        notes: validatedData.notes || null,
        status: 'completed',
      }, {
        onConflict: 'restaurant_id'
      });

    if (onboardingError) {
      console.error('Onboarding record update error (non-fatal):', onboardingError);
    }

    return NextResponse.json({
      success: true,
      restaurant,
      message: 'Restaurant onboarding completed successfully',
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Complete onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
