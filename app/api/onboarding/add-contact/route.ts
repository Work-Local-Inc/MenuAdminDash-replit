import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAuth } from '@/lib/auth/admin-check';
import { AuthError } from '@/lib/errors';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

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
    console.log('[Add Contact] Request body:', body);
    
    const validatedData = addContactSchema.parse(body);

    const supabase = createAdminClient() as any;

    // Check if an admin user with this email already exists
    const { data: existingAdmin } = await supabase
      .schema('menuca_v3')
      .from('admin_users')
      .select('id, email')
      .eq('email', validatedData.email)
      .single();

    let adminUserId: number;

    if (existingAdmin) {
      // Update existing admin user
      console.log('[Add Contact] Updating existing admin user:', existingAdmin.id);
      const { data, error } = await supabase
        .schema('menuca_v3')
        .from('admin_users')
        .update({
          first_name: validatedData.first_name,
          last_name: validatedData.last_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAdmin.id)
        .select()
        .single();

      if (error) {
        console.error('[Add Contact] Admin user update error:', error);
        throw error;
      }
      adminUserId = existingAdmin.id;
    } else {
      // Create new admin user with a temporary password
      console.log('[Add Contact] Creating new admin user for:', validatedData.email);
      const tempPassword = Math.random().toString(36).slice(-12);
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      
      const { data, error } = await supabase
        .schema('menuca_v3')
        .from('admin_users')
        .insert({
          email: validatedData.email,
          first_name: validatedData.first_name,
          last_name: validatedData.last_name,
          password_hash: passwordHash,
        })
        .select()
        .single();

      if (error) {
        console.error('[Add Contact] Admin user insert error:', error);
        throw error;
      }
      adminUserId = data.id;
    }

    // Check if restaurant link already exists
    const { data: existingLink } = await supabase
      .schema('menuca_v3')
      .from('admin_user_restaurants')
      .select('id')
      .eq('admin_user_id', adminUserId)
      .eq('restaurant_id', validatedData.restaurant_id)
      .single();

    if (!existingLink) {
      // Create link between admin user and restaurant
      const { error: linkError } = await supabase
        .schema('menuca_v3')
        .from('admin_user_restaurants')
        .insert({
          admin_user_id: adminUserId,
          restaurant_id: validatedData.restaurant_id,
          role: validatedData.title || 'Owner',
        });

      if (linkError) {
        console.error('[Add Contact] Restaurant link error:', linkError);
        throw linkError;
      }
    }

    // Also update phone in restaurant_locations (public contact)
    if (validatedData.phone) {
      const { error: locationError } = await supabase
        .schema('menuca_v3')
        .from('restaurant_locations')
        .update({ 
          phone: validatedData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('restaurant_id', validatedData.restaurant_id)
        .eq('is_primary', true);

      if (locationError) {
        console.error('[Add Contact] Location phone update error (non-fatal):', locationError);
      }
    }

    return NextResponse.json({
      success: true,
      contact: {
        admin_user_id: adminUserId,
        email: validatedData.email,
        first_name: validatedData.first_name,
        last_name: validatedData.last_name,
        phone: validatedData.phone,
        title: validatedData.title,
      },
      message: 'Contact saved successfully',
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof z.ZodError) {
      console.error('[Add Contact] Validation error:', error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('[Add Contact] Onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add contact' },
      { status: 500 }
    );
  }
}
