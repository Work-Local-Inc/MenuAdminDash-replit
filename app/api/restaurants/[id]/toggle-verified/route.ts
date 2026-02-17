import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { resolveIdParam } from "@/lib/utils/uuid";
export const dynamic = "force-dynamic";

export async function POST(
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

    const supabase = (await createClient()) as any;
    const { column, value } = resolveIdParam(params.id);

    // Get current verified status
    const { data: restaurant, error: fetchError } = await supabase
      .from("restaurants")
      .select("verified")
      .eq(column, value)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Toggle the verified status
    const newVerifiedStatus = !restaurant.verified;

    const { data, error: updateError } = await supabase
      .from("restaurants")
      .update({ verified: newVerifiedStatus })
      .eq(column, value)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      verified: newVerifiedStatus,
      restaurant: data,
    });
  } catch (error: any) {
    console.error("Toggle verified error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to toggle verified status" },
      { status: 500 },
    );
  }
}
