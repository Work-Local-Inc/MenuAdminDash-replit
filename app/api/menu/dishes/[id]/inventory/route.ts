import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveIdParam } from "@/lib/utils/uuid";
export const dynamic = "force-dynamic";

// dish_inventory does NOT have dish_uuid — resolve to integer dish_id
async function resolveDishIntId(
  supabase: any,
  param: string,
): Promise<number | null> {
  const { column, value } = resolveIdParam(param);
  if (column === "uuid") {
    const { data: dish } = await supabase
      .from("dishes")
      .select("id")
      .eq("uuid", value)
      .single();
    return dish?.id ?? null;
  }
  return value as number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    let dishResolved;
    try {
      dishResolved = resolveIdParam(params.id);
    } catch {
      return NextResponse.json({ error: "Invalid dish ID" }, { status: 400 });
    }

    const supabase = (await createClient()) as any;

    const dishIntId = await resolveDishIntId(supabase, params.id);
    if (dishIntId === null) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("dish_inventory")
      .select(
        "dish_id, is_available, unavailable_until, reason, notes, updated_by_admin_id, updated_at",
      )
      .eq("dish_id", dishIntId)
      .single();

    if (error && error.code === "PGRST116") {
      // No data found, return default values
      return NextResponse.json({
        dish_id: dishIntId,
        is_available: true,
        unavailable_until: null,
        reason: null,
        notes: null,
      });
    }

    if (error) {
      console.error("Error fetching dish inventory:", error);
      return NextResponse.json(
        { error: "Failed to fetch dish inventory" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching dish inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch dish inventory" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    let dishResolved;
    try {
      dishResolved = resolveIdParam(params.id);
    } catch {
      return NextResponse.json({ error: "Invalid dish ID" }, { status: 400 });
    }

    const body = await request.json();
    const { is_available, unavailable_until, reason, notes } = body;

    const supabase = (await createClient()) as any;

    const dishIntId = await resolveDishIntId(supabase, params.id);
    if (dishIntId === null) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    const upsertData = {
      dish_id: dishIntId,
      is_available: is_available ?? true,
      unavailable_until: unavailable_until || null,
      reason: reason || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("dish_inventory")
      .upsert(upsertData, { onConflict: "dish_id" })
      .select()
      .single();

    if (error) {
      console.error("Error updating dish inventory:", error);
      return NextResponse.json(
        { error: "Failed to update dish inventory" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error updating dish inventory:", error);
    return NextResponse.json(
      { error: "Failed to update dish inventory" },
      { status: 500 },
    );
  }
}
