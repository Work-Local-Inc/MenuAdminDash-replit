import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const scheduleTemplateSchema = z.object({
  restaurant_id: z.number(),
  template_name: z.enum(['24/7', 'Mon-Fri 9-5', 'Mon-Fri 11-9, Sat-Sun 11-10', 'Lunch & Dinner']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = scheduleTemplateSchema.parse(body);

    const supabase = await createClient();

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call Santiago's apply-schedule-template Edge Function
    const { data, error } = await supabase.functions.invoke('apply-schedule-template', {
      body: validatedData,
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Apply schedule template error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply schedule template' },
      { status: 500 }
    );
  }
}
