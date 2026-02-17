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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    try {
      resolveIdParam(params.id);
    } catch {
      return NextResponse.json({ error: "Invalid dish ID" }, { status: 400 });
    }

    const { group_ids } = await request.json();

    if (!Array.isArray(group_ids) || group_ids.length === 0) {
      return NextResponse.json(
        { error: "group_ids array is required" },
        { status: 400 },
      );
    }

    const supabase = (await createClient()) as any;

    const dishIntId = await resolveDishIntId(supabase, params.id);
    if (dishIntId === null) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    // Verify all groups belong to this dish
    const { data: verifyData, error: verifyError } = await supabase
      .from("modifier_groups")
      .select("id")
      .in("id", group_ids)
      .eq("dish_id", dishIntId);

    if (verifyError || !verifyData || verifyData.length !== group_ids.length) {
      return NextResponse.json(
        { error: "Some modifier groups do not belong to this dish" },
        { status: 400 },
      );
    }

    // Perform sequential updates for atomicity
    for (let i = 0; i < group_ids.length; i++) {
      const { data, error } = await supabase
        .from("modifier_groups")
        .update({
          display_order: i,
          updated_at: new Date().toISOString(),
        })
        .eq("id", group_ids[i])
        .eq("dish_id", dishIntId)
        .select("id");

      if (error || !data || data.length === 0) {
        console.error(`Error updating group ${group_ids[i]}:`, error);
        return NextResponse.json(
          { error: `Modifier group ${group_ids[i]} not found` },
          { status: 404 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error reordering modifier groups:", error);
    return NextResponse.json(
      { error: "Failed to reorder modifier groups" },
      { status: 500 },
    );
  }
}
