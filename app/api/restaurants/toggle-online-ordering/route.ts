import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthError } from "@/lib/errors";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request);

    const supabase = createAdminClient() as any;

    const body = await request.json();
    const { restaurant_id, enabled, reason } = body;

    if (!restaurant_id) {
      return NextResponse.json(
        { error: "restaurant_id is required" },
        { status: 400 },
      );
    }

    if (enabled === undefined || enabled === null) {
      return NextResponse.json(
        { error: "enabled is required" },
        { status: 400 },
      );
    }

    if (!enabled && !reason) {
      return NextResponse.json(
        {
          error: "Reason is required when disabling online ordering",
        },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("restaurants")
      .update({
        online_ordering_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", restaurant_id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Online ordering ${enabled ? "enabled" : "disabled"} successfully`,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to toggle online ordering" },
      { status: 500 },
    );
  }
}
