import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { AuthError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveFkParam } from "@/lib/utils/uuid";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; tagId: string } },
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

    // Remove tag assignment
    const { error } = await supabase
      .from("restaurant_tag_assignments")
      .delete()
      .eq(restFk.column, restFk.value)
      .eq("tag_id", parseInt(params.tagId));

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Tag removed successfully",
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("Error removing tag:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove tag" },
      { status: 500 },
    );
  }
}
