import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { AuthError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { adminUser } = await verifyAdminAuth(request);

    const restaurantId = parseInt(params.id);
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

    const supabase = createAdminClient() as any;

    // Get onboarding record directly
    const { data: onboarding, error: onboardingError } = await supabase
      .from("restaurant_onboarding")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (onboardingError) throw onboardingError;

    // Get restaurant basic info for context
    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .select("id, name, status, created_at")
      .eq("id", restaurantId)
      .single();

    if (restError) throw restError;

    return NextResponse.json({
      restaurant,
      onboarding: onboarding || { status: "not_started" },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("Error fetching onboarding status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch onboarding status" },
      { status: 500 },
    );
  }
}
