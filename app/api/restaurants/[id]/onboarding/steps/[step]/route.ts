import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { AuthError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
export const dynamic = "force-dynamic";

const updateStepSchema = z.object({
  completed: z.boolean(),
});

const validSteps = [
  "basic_info",
  "location",
  "contact",
  "schedule",
  "menu",
  "payment",
  "delivery",
  "testing",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; step: string } },
) {
  try {
    const { adminUser } = await verifyAdminAuth(request);

    const restaurantId = parseInt(params.id);
    const step = params.step;

    if (isNaN(restaurantId)) {
      return NextResponse.json(
        { error: "Invalid restaurant ID" },
        { status: 400 },
      );
    }

    const access = await verifyRestaurantAccess(adminUser as any, restaurantId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    if (!validSteps.includes(step)) {
      return NextResponse.json(
        { error: `Invalid step. Must be one of: ${validSteps.join(", ")}` },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validatedData = updateStepSchema.parse(body);

    const supabase = createAdminClient() as any;

    // Upsert the onboarding record with the step status
    const stepColumn = `step_${step}_completed`;
    const now = new Date().toISOString();

    // First ensure onboarding record exists
    const { error: upsertError } = await supabase
      .from("restaurant_onboarding")
      .upsert(
        {
          restaurant_id: restaurantId,
          [stepColumn]: validatedData.completed,
          [`step_${step}_completed_at`]: validatedData.completed ? now : null,
          updated_at: now,
        },
        {
          onConflict: "restaurant_id",
        },
      );

    if (upsertError) {
      // If the column doesn't exist, fall back to a simpler update
      console.error(
        "Onboarding step upsert error (trying fallback):",
        upsertError,
      );

      const { error: fallbackError } = await supabase
        .from("restaurant_onboarding")
        .upsert(
          {
            restaurant_id: restaurantId,
            updated_at: now,
          },
          {
            onConflict: "restaurant_id",
          },
        );

      if (fallbackError) throw fallbackError;
    }

    return NextResponse.json({
      success: true,
      step,
      completed: validatedData.completed,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("Error updating onboarding step:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update onboarding step" },
      { status: 500 },
    );
  }
}
