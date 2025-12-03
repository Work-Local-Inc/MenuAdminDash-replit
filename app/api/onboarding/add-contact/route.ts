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
    console.log('Add contact request body:', body);
    
    const validatedData = addContactSchema.parse(body);

    const supabase = createAdminClient() as any;

    // Check if contact already exists for this restaurant
    const { data: existingContact } = await supabase
      .from('restaurant_contacts')
      .select('id')
      .eq('restaurant_id', validatedData.restaurant_id)
      .single();

    let result;

    if (existingContact) {
      // Update existing contact
      const { data, error } = await supabase
        .from('restaurant_contacts')
        .update({
          first_name: validatedData.first_name,
          last_name: validatedData.last_name,
          email: validatedData.email,
          phone: validatedData.phone,
          title: validatedData.title,
          preferred_language: validatedData.preferred_language,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingContact.id)
        .select()
        .single();

      if (error) {
        console.error('Contact update error:', error);
        throw error;
      }
      result = data;
    } else {
      // Create new contact
      const { data, error } = await supabase
        .from('restaurant_contacts')
        .insert({
          restaurant_id: validatedData.restaurant_id,
          first_name: validatedData.first_name,
          last_name: validatedData.last_name,
          email: validatedData.email,
          phone: validatedData.phone,
          title: validatedData.title,
          preferred_language: validatedData.preferred_language,
          is_primary: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Contact insert error:', error);
        throw error;
      }
      result = data;
    }

    return NextResponse.json({
      success: true,
      contact: result,
      message: 'Contact saved successfully',
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Add contact onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add contact' },
      { status: 500 }
    );
  }
}
