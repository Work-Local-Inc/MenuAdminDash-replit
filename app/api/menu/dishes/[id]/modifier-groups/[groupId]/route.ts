import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveIdParam } from "@/lib/utils/uuid";
export const dynamic = "force-dynamic";

// modifier_groups does NOT have dish_uuid — resolve to integer dish_id
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string } },
) {
  try {
    let dishResolved, groupResolved;
    try {
      dishResolved = resolveIdParam(params.id);
      groupResolved = resolveIdParam(params.groupId);
    } catch {
      return NextResponse.json(
        { error: "Invalid dish ID or group ID" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const { name, is_required, min_selections, max_selections } = body;

    // Validate min/max relationship
    const finalMin = min_selections !== undefined ? min_selections : null;
    const finalMax = max_selections !== undefined ? max_selections : null;

    if (finalMin !== null && finalMax !== null && finalMin > finalMax) {
      return NextResponse.json(
        { error: "min_selections cannot be greater than max_selections" },
        { status: 400 },
      );
    }

    const updateData: any = {};

    if (name !== undefined) {
      if (!name?.trim()) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 },
        );
      }
      updateData.name = name.trim();
    }

    if (is_required !== undefined) {
      updateData.is_required = is_required;
    }

    if (min_selections !== undefined) {
      updateData.min_selections = min_selections;
    }

    if (max_selections !== undefined) {
      updateData.max_selections = max_selections;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    updateData.updated_at = new Date().toISOString();

    const supabase = (await createClient()) as any;

    // modifier_groups has no dish_uuid — resolve to int
    const dishIntId = await resolveDishIntId(supabase, params.id);
    if (dishIntId === null) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    // modifier_groups has its own uuid, so groupId can use resolveIdParam
    const { column: groupCol, value: groupVal } = groupResolved;

    const { data, error } = await supabase
      .from("modifier_groups")
      .update(updateData)
      .eq(groupCol, groupVal)
      .eq("dish_id", dishIntId)
      .select()
      .single();

    if (error || !data) {
      if (error?.code === "PGRST116") {
        return NextResponse.json(
          { error: "Modifier group not found or does not belong to this dish" },
          { status: 404 },
        );
      }
      console.error("Error updating modifier group:", error);
      return NextResponse.json(
        { error: "Failed to update modifier group" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error updating modifier group:", error);
    return NextResponse.json(
      { error: "Failed to update modifier group" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string } },
) {
  try {
    let dishResolved, groupResolved;
    try {
      dishResolved = resolveIdParam(params.id);
      groupResolved = resolveIdParam(params.groupId);
    } catch {
      return NextResponse.json(
        { error: "Invalid dish ID or group ID" },
        { status: 400 },
      );
    }

    const supabase = (await createClient()) as any;

    const dishIntId = await resolveDishIntId(supabase, params.id);
    if (dishIntId === null) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    const { column: groupCol, value: groupVal } = groupResolved;

    const { data, error } = await supabase
      .from("modifier_groups")
      .delete()
      .eq(groupCol, groupVal)
      .eq("dish_id", dishIntId)
      .select("id");

    if (error || !data || data.length === 0) {
      if (error?.code === "PGRST116" || !data || data.length === 0) {
        return NextResponse.json(
          { error: "Modifier group not found or does not belong to this dish" },
          { status: 404 },
        );
      }
      console.error("Error deleting modifier group:", error);
      return NextResponse.json(
        { error: "Failed to delete modifier group" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting modifier group:", error);
    return NextResponse.json(
      { error: "Failed to delete modifier group" },
      { status: 500 },
    );
  }
}
