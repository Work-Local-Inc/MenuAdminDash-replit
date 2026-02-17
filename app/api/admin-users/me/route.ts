import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { AuthError } from "@/lib/errors";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, adminUser } = await verifyAdminAuth(request);

    console.log(
      "[/api/admin-users/me] SUCCESS:",
      adminUser.email,
      "ID:",
      adminUser.id,
      "Role:",
      adminUser.role_id,
    );

    return NextResponse.json({
      admin_id: adminUser.id,
      email: adminUser.email,
      first_name: adminUser.first_name,
      last_name: adminUser.last_name,
      role_id: adminUser.role_id,
      is_active: true,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("[/api/admin-users/me] EXCEPTION:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get admin info" },
      { status: 500 },
    );
  }
}
