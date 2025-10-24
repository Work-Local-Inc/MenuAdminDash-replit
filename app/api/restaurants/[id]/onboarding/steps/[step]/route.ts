import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const updateStepSchema = z.object({
  completed: z.boolean(),
});

const validSteps = [
  'basic_info',
  'location',
  'contact',
  'schedule',
  'menu',
  'payment',
  'delivery',
  'testing',
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; step: string } }
) {
  try {
    const restaurantId = parseInt(params.id);
    const step = params.step;

    if (isNaN(restaurantId)) {
      return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 });
    }

    if (!validSteps.includes(step)) {
      return NextResponse.json(
        { error: `Invalid step. Must be one of: ${validSteps.join(', ')}` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateStepSchema.parse(body);

    const supabase = createAdminClient();

    // Get current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call Santiago's update-onboarding-step Edge Function
    const { data, error } = await supabase.functions.invoke('update-onboarding-step', {
      body: {
        restaurant_id: restaurantId,
        step: step,
        ...validatedData,
      },
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating onboarding step:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update onboarding step' },
      { status: 500 }
    );
  }
}
