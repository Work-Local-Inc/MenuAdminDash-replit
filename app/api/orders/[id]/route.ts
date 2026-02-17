import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { AuthError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveIdParam, resolveFkParam } from "@/lib/utils/uuid";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { adminUser } = await verifyAdminAuth(request);

    let orderResolved;
    try {
      orderResolved = resolveIdParam(params.id);
    } catch {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }
    const { column: orderCol, value: orderVal } = orderResolved;

    const supabase = createAdminClient();

    const baseColumns = `
      id,
      order_number,
      order_type,
      order_status,
      created_at,
      user_id,
      restaurant_id,
      items,
      subtotal,
      delivery_fee,
      tax_amount,
      tip_amount,
      total_amount,
      payment_status,
      payment_method,
      delivery_address,
      special_instructions,
      stripe_payment_intent_id,
      restaurants(id, name)
    `;

    const guestColumns = `
      is_guest_order,
      guest_name,
      guest_phone,
      guest_email,
    `;

    let { data, error } = await supabase
      .from("orders")
      .select(guestColumns + baseColumns)
      .eq(orderCol, orderVal)
      .single();

    if (error) {
      const fallback = await supabase
        .from("orders")
        .select(baseColumns)
        .eq(orderCol, orderVal)
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data) {
      return NextResponse.json(
        { error: `Order #${params.id} not found` },
        { status: 404 },
      );
    }

    if ((adminUser as any).role_id === 2) {
      const { data: assignments } = await (supabase as any)
        .schema("menuca_v3")
        .from("admin_user_restaurants")
        .select("restaurant_id")
        .eq("admin_user_id", (adminUser as any).id);

      const allowedIds = (assignments || []).map((a: any) => a.restaurant_id);
      if (!allowedIds.includes(data.restaurant_id)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const order = {
      ...data,
      total: data.total_amount,
      restaurant_name: (data as any).restaurants?.name || null,
      customer_name: (data as any).guest_name || null,
      customer_email: (data as any).guest_email || null,
      customer_phone: (data as any).guest_phone || null,
    };

    return NextResponse.json(order);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("[Orders] Single order fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch order" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { adminUser } = await verifyAdminAuth(request);
    if ((adminUser as any).role_id !== 1) {
      return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
    }

    let deleteResolved;
    try {
      deleteResolved = resolveIdParam(params.id);
    } catch {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }
    const { column: delCol, value: delVal } = deleteResolved;

    const supabase = createAdminClient() as any;

    // order_status_history has order_uuid — use resolveFkParam
    const historyFk = resolveFkParam(params.id, "order_id", "order_uuid");
    await supabase
      .from("order_status_history")
      .delete()
      .eq(historyFk.column, historyFk.value);

    // order_items does NOT have order_uuid — resolve to integer
    let orderIntId: number;
    if (delCol === "uuid") {
      const { data: orderRow } = await supabase
        .from("orders")
        .select("id")
        .eq("uuid", delVal)
        .single();
      if (!orderRow) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      orderIntId = orderRow.id;
    } else {
      orderIntId = delVal as number;
    }
    await supabase.from("order_items").delete().eq("order_id", orderIntId);

    // payment_transactions has order_uuid — use resolveFkParam
    const paymentFk = resolveFkParam(params.id, "order_id", "order_uuid");
    await supabase
      .from("payment_transactions")
      .delete()
      .eq(paymentFk.column, paymentFk.value);

    const { error } = await supabase.from("orders").delete().eq(delCol, delVal);
    if (error) {
      console.error(`[Orders] Delete error for order ${params.id}:`, error);
      return NextResponse.json(
        { error: "Failed to delete order" },
        { status: 500 },
      );
    }

    console.log(
      `[Orders] Order ${params.id} deleted by admin ${(adminUser as any).id}`,
    );
    return NextResponse.json({ success: true, deleted: params.id });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("[Orders] Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 },
    );
  }
}
