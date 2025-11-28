import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAuth } from '@/lib/auth/admin-check';
import { AuthError } from '@/lib/errors';
import { z } from 'zod';

const addContactSchema = z.object({
  restaurant_id: z.number(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone is required'),
  title: z.string().default('Owner'),
  preferred_language: z.string().length(2).default('en'),
});

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request);
    
    const body = await request.json();
    const validatedData = addContactSchema.parse(body);

    const supabase = createAdminClient() as any;

    // Call Santiago's SQL function directly
    const { data, error } = await supabase.rpc('add_primary_contact_onboarding', {
      p_restaurant_id: validatedData.restaurant_id,
      p_first_name: validatedData.first_name,
      p_last_name: validatedData.last_name,
      p_email: validatedData.email,
      p_phone: validatedData.phone,
      p_title: validatedData.title,
      p_preferred_language: validatedData.preferred_language,
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Add contact onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add contact' },
      { status: 500 }
    );
  }
}
