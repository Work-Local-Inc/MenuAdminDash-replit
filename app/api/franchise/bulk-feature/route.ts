import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthError } from "@/lib/errors";
import { z } from "zod";
export const dynamic = "force-dynamic";

const bulkFeatureSchema = z.object({
  parent_restaurant_id: z.number().int().positive(),
  feature_key: z.enum([
    "online_ordering",
    "delivery",
    "pickup",
    "loyalty_program",
    "reservations",
    "gift_cards",
    "catering",
    "table_booking",
  ]),
  is_enabled: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifyAdminAuth(request);
    const supabase = createAdminClient() as any;

    const body = await request.json();
    const validatedData = bulkFeatureSchema.parse(body);

    // Get all child restaurants of this franchise parent
    const { data: children, error: childError } = await supabase
      .from("restaurants")
      .select("id")
      .eq("parent_restaurant_id", validatedData.parent_restaurant_id);

    if (childError) throw childError;

    const allIds = [
      validatedData.parent_restaurant_id,
      ...(children || []).map((c: any) => c.id),
    ];

    // Map feature_key to the actual column name
    const columnMap: Record<string, string> = {
      online_ordering: "online_ordering_enabled",
      delivery: "delivery_enabled",
      pickup: "pickup_enabled",
      loyalty_program: "loyalty_program_enabled",
      reservations: "reservations_enabled",
      gift_cards: "gift_cards_enabled",
      catering: "catering_enabled",
      table_booking: "table_booking_enabled",
    };

    const column =
      columnMap[validatedData.feature_key] ||
      `${validatedData.feature_key}_enabled`;

    const { data, error } = await supabase
      .from("restaurants")
      .update({
        [column]: validatedData.is_enabled,
        updated_at: new Date().toISOString(),
      })
      .in("id", allIds)
      .select("id, name");

    if (error) throw error;

    return NextResponse.json({
      success: true,
      updated_count: data?.length || 0,
      restaurants: data,
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
        error: error.message || "Failed to update franchise feature",
      },
      { status: 500 },
    );
  }
}
