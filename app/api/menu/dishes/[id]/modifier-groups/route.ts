import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { resolveIdParam } from "@/lib/utils/uuid";
export const dynamic = "force-dynamic";

// modifier_groups does NOT have dish_uuid — resolve to integer dish_id
async function resolveDishIntId(
  supabase: any,
  param: string,
): Promise<{ dishIntId: number } | { error: string; status: number }> {
  const { column, value } = resolveIdParam(param);
  if (column === "uuid") {
    const { data: dish } = await supabase
      .from("dishes")
      .select("id")
      .eq("uuid", value)
      .single();
    if (!dish) return { error: "Dish not found", status: 404 };
    return { dishIntId: dish.id };
  }
  return { dishIntId: value as number };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { adminUser } = await verifyAdminAuth(request);

    let dishResolved;
    try {
      resolveIdParam(params.id);
    } catch {
      return NextResponse.json({ error: "Invalid dish ID" }, { status: 400 });
    }

    const supabase = (await createClient()) as any;

    const result = await resolveDishIntId(supabase, params.id);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    const { dishIntId } = result;

    const { data, error } = await supabase
      .from("modifier_groups")
      .select(
        "id, dish_id, name, display_order, is_required, min_selections, max_selections, created_at, updated_at",
      )
      .eq("dish_id", dishIntId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching modifier groups:", error);
      return NextResponse.json(
        { error: "Failed to fetch modifier groups" },
        { status: 500 },
      );
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error fetching modifier groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch modifier groups" },
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

    try {
      resolveIdParam(params.id);
    } catch {
      return NextResponse.json({ error: "Invalid dish ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, is_required, min_selections, max_selections } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = (await createClient()) as any;

    const result = await resolveDishIntId(supabase, params.id);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    const { dishIntId } = result;

    const { data: maxOrderData } = await supabase
      .from("modifier_groups")
      .select("display_order")
      .eq("dish_id", dishIntId)
      .order("display_order", { ascending: false })
      .limit(1);

    const nextOrder = (maxOrderData?.[0]?.display_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("modifier_groups")
      .insert({
        dish_id: dishIntId,
        name: name.trim(),
        display_order: nextOrder,
        is_required: is_required ?? false,
        min_selections: min_selections ?? 0,
        max_selections: max_selections ?? 999,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating modifier group:", error);
      return NextResponse.json(
        { error: "Failed to create modifier group" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error creating modifier group:", error);
    return NextResponse.json(
      { error: "Failed to create modifier group" },
      { status: 500 },
    );
  }
}
