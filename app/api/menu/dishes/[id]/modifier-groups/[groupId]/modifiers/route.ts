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

export async function GET(
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

    const supabase = (await createClient()) as any;

    const groupIntId = await resolveGroupIntId(supabase, params.groupId);
    if (groupIntId === null) {
      return NextResponse.json(
        { error: "Modifier group not found" },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("dish_modifier_items")
      .select(
        "id, modifier_group_id, name, price, is_default, display_order, created_at, updated_at",
      )
      .eq("modifier_group_id", groupIntId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching modifiers:", error);
      return NextResponse.json(
        { error: "Failed to fetch modifiers" },
        { status: 500 },
      );
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("Error fetching modifiers:", error);
    return NextResponse.json(
      { error: "Failed to fetch modifiers" },
      { status: 500 },
    );
  }
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

    const body = await request.json();

    const { name, price, is_default } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (price === undefined || price === null) {
      return NextResponse.json({ error: "Price is required" }, { status: 400 });
    }

    const supabase = (await createClient()) as any;

    const groupIntId = await resolveGroupIntId(supabase, params.groupId);
    if (groupIntId === null) {
      return NextResponse.json(
        { error: "Modifier group not found" },
        { status: 404 },
      );
    }

    const { data: maxOrderData } = await supabase
      .from("dish_modifier_items")
      .select("display_order")
      .eq("modifier_group_id", groupIntId)
      .order("display_order", { ascending: false })
      .limit(1);

    const nextOrder = (maxOrderData?.[0]?.display_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("dish_modifier_items")
      .insert({
        modifier_group_id: groupIntId,
        name: name.trim(),
        price,
        is_default: is_default ?? false,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating modifier:", error);
      return NextResponse.json(
        { error: "Failed to create modifier" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error creating modifier:", error);
    return NextResponse.json(
      { error: "Failed to create modifier" },
      { status: 500 },
    );
  }
}
