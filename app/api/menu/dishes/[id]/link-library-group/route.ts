import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { AuthError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveIdParam, resolveFkParam } from "@/lib/utils/uuid";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await verifyAdminAuth(request);
    const supabase = createAdminClient() as any;

    const { id } = await params;

    let dishResolved;
    try {
      dishResolved = resolveIdParam(id);
    } catch {
      return NextResponse.json({ error: "Invalid dish ID" }, { status: 400 });
    }
    const { column: dishCol, value: dishVal } = dishResolved;

    const body = await request.json();
    const { modifier_group_id } = body;

    if (!modifier_group_id || typeof modifier_group_id !== "number") {
      return NextResponse.json(
        { error: "modifier_group_id is required and must be a number" },
        { status: 400 },
      );
    }

    // dish_modifier_groups has dish_uuid, so use resolveFkParam for queries
    const dishFk = resolveFkParam(id, "dish_id", "dish_uuid");

    const { data: existing, error: checkError } = await supabase
      .schema("menuca_v3")
      .from("dish_modifier_groups")
      .select("id")
      .eq(dishFk.column, dishFk.value)
      .eq("modifier_group_id", modifier_group_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      return NextResponse.json(
        { error: "This modifier group is already linked to this dish" },
        { status: 409 },
      );
    }

    // For inserts, always use integer FK — resolve UUID to int if needed
    let dishIntId: number;
    if (dishCol === "uuid") {
      const { data: dish } = await supabase
        .schema("menuca_v3")
        .from("dishes")
        .select("id")
        .eq("uuid", dishVal)
        .single();
      if (!dish) {
        return NextResponse.json({ error: "Dish not found" }, { status: 404 });
      }
      dishIntId = dish.id;
    } else {
      dishIntId = dishVal as number;
    }

    const { data: link, error: insertError } = await supabase
      .schema("menuca_v3")
      .from("dish_modifier_groups")
      .insert({
        dish_id: dishIntId,
        modifier_group_id: modifier_group_id,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(link);
  } catch (error: any) {
    console.error("[LINK LIBRARY GROUP ERROR]", error);
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to link library group" },
      { status: 500 },
    );
  }
}
