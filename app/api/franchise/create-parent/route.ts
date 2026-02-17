import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthError } from "@/lib/errors";
import { z } from "zod";
export const dynamic = "force-dynamic";

const createParentSchema = z.object({
  name: z.string().min(2).max(255),
  franchise_brand_name: z.string().min(2).max(255),
  timezone: z.string().default("America/Toronto"),
});

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifyAdminAuth(request);
    const supabase = createAdminClient() as any;

    const body = await request.json();
    const validatedData = createParentSchema.parse(body);

    // Create a franchise parent restaurant
    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .insert({
        name: validatedData.name,
        franchise_brand_name: validatedData.franchise_brand_name,
        timezone: validatedData.timezone,
        is_franchise_parent: true,
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      restaurant_id: restaurant.id,
      restaurant,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: error.message || "Failed to create franchise parent",
      },
      { status: 500 },
    );
  }
}
