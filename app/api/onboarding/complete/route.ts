import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const completeOnboardingSchema = z.object({
  restaurant_id: z.number(),
  notes: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = completeOnboardingSchema.parse(body);

    const supabase = createAdminClient();

    // Check authentication - must be admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call Santiago's complete-restaurant-onboarding Edge Function
    const { data, error } = await supabase.functions.invoke('complete-restaurant-onboarding', {
      body: validatedData,
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Complete onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
