import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-check';
import { AuthError } from '@/lib/errors';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const copyMenuSchema = z.object({
  target_restaurant_id: z.number(),
  source_restaurant_id: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request);

    const body = await request.json();
    const validatedData = copyMenuSchema.parse(body);

    const supabase = createAdminClient();

    // Call Santiago's copy-franchise-menu Edge Function
    const { data, error } = await supabase.functions.invoke('copy-franchise-menu', {
      body: validatedData,
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
    console.error('Copy franchise menu error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to copy franchise menu' },
      { status: 500 }
    );
  }
}
