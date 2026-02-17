import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { AuthError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request);

    const supabase = createAdminClient() as any;

    // Get onboarding stats directly from the database
    const { data: restaurants, error } = await supabase
      .from("restaurants")
      .select("id, name, status, created_at")
      .in("status", ["pending", "onboarding"])
      .order("created_at", { ascending: false });

    if (error) throw error;

    const { count: totalPending } = await supabase
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: totalActive } = await supabase
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    return NextResponse.json({
      pending_restaurants: restaurants || [],
      stats: {
        pending: totalPending || 0,
        active: totalActive || 0,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("Error fetching onboarding dashboard:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch onboarding dashboard" },
      { status: 500 },
    );
  }
}
