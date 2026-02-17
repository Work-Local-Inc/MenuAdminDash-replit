import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveIdParam } from "@/lib/utils/uuid";
export const dynamic = "force-dynamic";

// dish_modifier_items and modifier_groups don't have dish_uuid/modifier_group_uuid
// Resolve all three params to integer IDs for the verification join query
async function resolveIntIds(
  supabase: any,
  dishParam: string,
  groupParam: string,
  modifierParam: string,
) {
  const dishRes = resolveIdParam(dishParam);
  const groupRes = resolveIdParam(groupParam);
  const modifierRes = resolveIdParam(modifierParam);

  let dishIntId: number;
  if (dishRes.column === "uuid") {
    const { data: dish } = await supabase
      .from("dishes")
      .select("id")
      .eq("uuid", dishRes.value)
      .single();
    if (!dish) return null;
    dishIntId = dish.id;
  } else {
    dishIntId = dishRes.value as number;
  }

  let groupIntId: number;
  if (groupRes.column === "uuid") {
    const { data: group } = await supabase
      .from("modifier_groups")
      .select("id")
      .eq("uuid", groupRes.value)
      .single();
    if (!group) return null;
    groupIntId = group.id;
  } else {
    groupIntId = groupRes.value as number;
  }

  let modifierIntId: number;
  if (modifierRes.column === "uuid") {
    const { data: modifier } = await supabase
      .from("dish_modifier_items")
      .select("id")
      .eq("uuid", modifierRes.value)
      .single();
    if (!modifier) return null;
    modifierIntId = modifier.id;
  } else {
    modifierIntId = modifierRes.value as number;
  }

  return { dishIntId, groupIntId, modifierIntId };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string; modifierId: string } },
) {
  try {
    try {
      resolveIdParam(params.id);
      resolveIdParam(params.groupId);
      resolveIdParam(params.modifierId);
    } catch {
      return NextResponse.json(
        { error: "Invalid ID parameter" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { name, price, is_default } = body;

    const supabase = (await createClient()) as any;

    const ids = await resolveIntIds(
      supabase,
      params.id,
      params.groupId,
      params.modifierId,
    );
    if (!ids) {
      return NextResponse.json(
        { error: "Modifier not found or does not belong to this group/dish" },
        { status: 404 },
      );
    }
    const { dishIntId, groupIntId, modifierIntId } = ids;

    // Verify the modifier belongs to the group and the group belongs to the dish
    const { data: verifyData, error: verifyError } = await supabase
      .from("dish_modifier_items")
      .select("id, modifier_groups!inner(id, dish_id)")
      .eq("id", modifierIntId)
      .eq("modifier_groups.id", groupIntId)
      .eq("modifier_groups.dish_id", dishIntId)
      .single();

    if (verifyError || !verifyData) {
      return NextResponse.json(
        { error: "Modifier not found or does not belong to this group/dish" },
        { status: 404 },
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

    if (price !== undefined && price !== null) {
      if (price < 0) {
        return NextResponse.json(
          { error: "Price cannot be negative" },
          { status: 400 },
        );
      }
      updateData.price = price;
    }

    if (is_default !== undefined) {
      updateData.is_default = is_default;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("dish_modifier_items")
      .update(updateData)
      .eq("id", modifierIntId)
      .select()
      .single();

    if (error) {
      console.error("Error updating modifier:", error);
      return NextResponse.json(
        { error: "Failed to update modifier" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error updating modifier:", error);
    return NextResponse.json(
      { error: "Failed to update modifier" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string; modifierId: string } },
) {
  try {
    try {
      resolveIdParam(params.id);
      resolveIdParam(params.groupId);
      resolveIdParam(params.modifierId);
    } catch {
      return NextResponse.json(
        { error: "Invalid ID parameter" },
        { status: 400 },
      );
    }

    const supabase = (await createClient()) as any;

    const ids = await resolveIntIds(
      supabase,
      params.id,
      params.groupId,
      params.modifierId,
    );
    if (!ids) {
      return NextResponse.json(
        { error: "Modifier not found or does not belong to this group/dish" },
        { status: 404 },
      );
    }
    const { dishIntId, groupIntId, modifierIntId } = ids;

    // Verify the modifier belongs to the group and the group belongs to the dish
    const { data: verifyData, error: verifyError } = await supabase
      .from("dish_modifier_items")
      .select("id, modifier_groups!inner(id, dish_id)")
      .eq("id", modifierIntId)
      .eq("modifier_groups.id", groupIntId)
      .eq("modifier_groups.dish_id", dishIntId)
      .single();

    if (verifyError || !verifyData) {
      return NextResponse.json(
        { error: "Modifier not found or does not belong to this group/dish" },
        { status: 404 },
      );
    }

    const { error } = await supabase
      .from("dish_modifier_items")
      .delete()
      .eq("id", modifierIntId);

    if (error) {
      console.error("Error deleting modifier:", error);
      return NextResponse.json(
        { error: "Failed to delete modifier" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting modifier:", error);
    return NextResponse.json(
      { error: "Failed to delete modifier" },
      { status: 500 },
    );
  }
}
