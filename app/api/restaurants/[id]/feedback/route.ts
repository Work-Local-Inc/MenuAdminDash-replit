import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthError } from "@/lib/errors";
import { resolveIdParam } from "@/lib/utils/uuid";
export const dynamic = "force-dynamic";

async function resolveRestaurantIntId(
  supabase: any,
  paramId: string,
): Promise<{ intId: number } | { error: string }> {
  const { column, value } = resolveIdParam(paramId);
  if (column === "uuid") {
    const { data: rest } = await supabase
      .from("restaurants")
      .select("id")
      .eq("uuid", value)
      .single();
    if (!rest) return { error: "Restaurant not found" };
    return { intId: rest.id };
  }
  return { intId: value as number };
}

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
    const resolved = await resolveRestaurantIntId(supabase, params.id);
    if ("error" in resolved)
      return NextResponse.json({ error: resolved.error }, { status: 404 });

    // Get rating filter from query params
    const { searchParams } = new URL(request.url);
    const ratingFilter = searchParams.get("rating");

    let query = supabase
      .from("restaurant_feedback")
      .select(
        `
        *,
        users:user_id (
          id,
          full_name,
          email
        )
      `,
      )
      .eq("restaurant_id", resolved.intId)
      .order("created_at", { ascending: false });

    // Apply rating filter if provided
    if (ratingFilter && ratingFilter !== "all") {
      query = query.eq("rating", parseInt(ratingFilter));
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch feedback" },
      { status: 500 },
    );
  }
}
