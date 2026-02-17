import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveIdParam } from "@/lib/utils/uuid";
export const dynamic = "force-dynamic";

// dish_modifier_items does NOT have modifier_group_uuid — resolve to integer
async function resolveGroupIntId(
  supabase: any,
  param: string,
): Promise<number | null> {
  const { column, value } = resolveIdParam(param);
  if (column === "uuid") {
    const { data: group } = await supabase
      .from("modifier_groups")
      .select("id")
      .eq("uuid", value)
      .single();
    return group?.id ?? null;
  }
  return value as number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string } },
) {
  try {
    let groupResolved;
    try {
      groupResolved = resolveIdParam(params.groupId);
    } catch {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
    }

    const { modifier_ids } = await request.json();

    if (!Array.isArray(modifier_ids) || modifier_ids.length === 0) {
      return NextResponse.json(
        { error: "modifier_ids array is required" },
        { status: 400 },
      );
    }

    const supabase = (await createClient()) as any;

    const groupIntId = await resolveGroupIntId(supabase, params.groupId);
    if (groupIntId === null) {
      return NextResponse.json(
        { error: "Modifier group not found" },
        { status: 404 },
      );
    }

    // Perform sequential updates for atomicity
    for (let i = 0; i < modifier_ids.length; i++) {
      const { error } = await supabase
        .from("dish_modifier_items")
        .update({
          display_order: i,
          updated_at: new Date().toISOString(),
        })
        .eq("id", modifier_ids[i])
        .eq("modifier_group_id", groupIntId);

      if (error) {
        console.error(`Error updating modifier ${modifier_ids[i]}:`, error);
        return NextResponse.json(
          { error: "Failed to reorder modifiers" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error reordering modifiers:", error);
    return NextResponse.json(
      { error: "Failed to reorder modifiers" },
      { status: 500 },
    );
  }
}
