import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { AuthError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
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

    const { data, error } = await supabase
      .from("restaurant_integrations")
      .select("*")
      .eq("restaurant_id", resolved.intId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch integrations" },
      { status: 500 },
    );
  }
}

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

    const supabase = createAdminClient() as any;
    const body = await request.json();
    const resolved = await resolveRestaurantIntId(supabase, params.id);
    if ("error" in resolved)
      return NextResponse.json({ error: resolved.error }, { status: 404 });

    const { data, error } = await supabase
      .from("restaurant_integrations")
      .insert({
        restaurant_id: resolved.intId,
        ...body,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to create integration" },
      { status: 500 },
    );
  }
}
