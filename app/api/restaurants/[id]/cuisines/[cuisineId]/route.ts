import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { AuthError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveFkParam } from "@/lib/utils/uuid";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; cuisineId: string } },
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

    const supabase = createAdminClient();
    const restFk = resolveFkParam(
      params.id,
      "restaurant_id",
      "restaurant_uuid",
    );
    const cuisineId = parseInt(params.cuisineId);

    // Remove cuisine assignment
    const { error } = await supabase
      .from("restaurant_cuisines")
      .delete()
      .eq(restFk.column, restFk.value)
      .eq("cuisine_type_id", cuisineId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Cuisine removed successfully",
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("Error removing cuisine:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove cuisine" },
      { status: 500 },
    );
  }
}
