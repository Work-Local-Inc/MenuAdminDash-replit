import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { AuthError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveIdParam, resolveFkParam } from "@/lib/utils/uuid";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { adminUser } = await verifyAdminAuth(request);

    const access = await verifyRestaurantAccess(adminUser as any, params.id);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const supabase = createAdminClient() as any;
    const onboardingFk = resolveFkParam(
      params.id,
      "restaurant_id",
      "restaurant_uuid",
    );
    const { column: restCol, value: restVal } = resolveIdParam(params.id);

    // Get onboarding record directly
    const { data: onboarding, error: onboardingError } = await supabase
      .from("restaurant_onboarding")
      .select("*")
      .eq(onboardingFk.column, onboardingFk.value)
      .maybeSingle();

    if (onboardingError) throw onboardingError;

    // Get restaurant basic info for context
    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .select("id, name, status, created_at")
      .eq(restCol, restVal)
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
