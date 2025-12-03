import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-check';
import { AuthError } from '@/lib/errors';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const scheduleTemplateSchema = z.object({
  restaurant_id: z.number(),
  template_name: z.enum(['24/7', 'Mon-Fri 9-5', 'Mon-Fri 11-9, Sat-Sun 11-10', 'Lunch & Dinner']),
});

type ScheduleTemplate = {
  [day: number]: { open: string; close: string; is_closed: boolean }[];
};

const SCHEDULE_TEMPLATES: { [key: string]: ScheduleTemplate } = {
  '24/7': {
    0: [{ open: '00:00', close: '23:59', is_closed: false }],
    1: [{ open: '00:00', close: '23:59', is_closed: false }],
    2: [{ open: '00:00', close: '23:59', is_closed: false }],
    3: [{ open: '00:00', close: '23:59', is_closed: false }],
    4: [{ open: '00:00', close: '23:59', is_closed: false }],
    5: [{ open: '00:00', close: '23:59', is_closed: false }],
    6: [{ open: '00:00', close: '23:59', is_closed: false }],
  },
  'Mon-Fri 9-5': {
    0: [{ open: '00:00', close: '00:00', is_closed: true }],
    1: [{ open: '09:00', close: '17:00', is_closed: false }],
    2: [{ open: '09:00', close: '17:00', is_closed: false }],
    3: [{ open: '09:00', close: '17:00', is_closed: false }],
    4: [{ open: '09:00', close: '17:00', is_closed: false }],
    5: [{ open: '09:00', close: '17:00', is_closed: false }],
    6: [{ open: '00:00', close: '00:00', is_closed: true }],
  },
  'Mon-Fri 11-9, Sat-Sun 11-10': {
    0: [{ open: '11:00', close: '22:00', is_closed: false }],
    1: [{ open: '11:00', close: '21:00', is_closed: false }],
    2: [{ open: '11:00', close: '21:00', is_closed: false }],
    3: [{ open: '11:00', close: '21:00', is_closed: false }],
    4: [{ open: '11:00', close: '21:00', is_closed: false }],
    5: [{ open: '11:00', close: '21:00', is_closed: false }],
    6: [{ open: '11:00', close: '22:00', is_closed: false }],
  },
  'Lunch & Dinner': {
    0: [{ open: '11:00', close: '14:00', is_closed: false }, { open: '17:00', close: '21:00', is_closed: false }],
    1: [{ open: '11:00', close: '14:00', is_closed: false }, { open: '17:00', close: '21:00', is_closed: false }],
    2: [{ open: '11:00', close: '14:00', is_closed: false }, { open: '17:00', close: '21:00', is_closed: false }],
    3: [{ open: '11:00', close: '14:00', is_closed: false }, { open: '17:00', close: '21:00', is_closed: false }],
    4: [{ open: '11:00', close: '14:00', is_closed: false }, { open: '17:00', close: '21:00', is_closed: false }],
    5: [{ open: '11:00', close: '14:00', is_closed: false }, { open: '17:00', close: '22:00', is_closed: false }],
    6: [{ open: '11:00', close: '14:00', is_closed: false }, { open: '17:00', close: '22:00', is_closed: false }],
  },
};

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request);

    const body = await request.json();
    console.log('Apply schedule template request:', body);
    
    const validatedData = scheduleTemplateSchema.parse(body);

    const supabase = createAdminClient() as any;

    const template = SCHEDULE_TEMPLATES[validatedData.template_name];
    if (!template) {
      return NextResponse.json({ error: 'Invalid template name' }, { status: 400 });
    }

    // Delete existing schedules for this restaurant
    await supabase
      .from('restaurant_schedules')
      .delete()
      .eq('restaurant_id', validatedData.restaurant_id);

    // Insert new schedules
    const scheduleRecords = [];
    for (const [dayOfWeek, slots] of Object.entries(template)) {
      for (const slot of slots) {
        scheduleRecords.push({
          restaurant_id: validatedData.restaurant_id,
          day_of_week: parseInt(dayOfWeek),
          open_time: slot.open,
          close_time: slot.close,
          is_closed: slot.is_closed,
        });
      }
    }

    const { data, error } = await supabase
      .from('restaurant_schedules')
      .insert(scheduleRecords)
      .select();

    if (error) {
      console.error('Schedule insert error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      schedules: data,
      message: `${validatedData.template_name} schedule applied successfully`,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Apply schedule template error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply schedule template' },
      { status: 500 }
    );
  }
}
