import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyDeviceAuth,
  isAuthError,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/tablet/verify-device";
import { orderStatusUpdateSchema } from "@/lib/validations/tablet";

/**
 * PATCH /api/tablet/orders/[id]/status
 *
 * Update order status (e.g., confirmed, preparing, ready)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params;

    // Verify device authentication
    const authResult = await verifyDeviceAuth(request);
    if (isAuthError(authResult)) {
      return authResult;
    }

    const deviceContext = authResult;

    // Check rate limit
    if (!checkRateLimit(deviceContext.device_id)) {
      return rateLimitResponse();
    }

    // Validate order ID
    const orderIdNum = parseInt(orderId, 10);
    if (isNaN(orderIdNum)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = orderStatusUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const { status, notes, estimated_ready_minutes } = validation.data;

    const supabase = createAdminClient() as any;

    // Verify order belongs to device's restaurant
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_status, restaurant_id, created_at")
      .eq("id", orderIdNum)
      .eq("restaurant_id", deviceContext.restaurant_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validate status transition
    // NOTE: Allow pending → preparing directly for auto-print flow (skips confirmed)
    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "preparing", "cancelled"],
      confirmed: ["preparing", "cancelled"],
      preparing: ["ready", "cancelled"],
      ready: ["out_for_delivery", "completed", "cancelled"],
      out_for_delivery: ["delivered", "cancelled"],
      delivered: [], // Final state
      completed: [], // Final state
      cancelled: [], // Final state
    };

    const currentStatus = order.order_status;
    const allowedNextStatuses = validTransitions[currentStatus] || [];

    if (!allowedNextStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from '${currentStatus}' to '${status}'`,
          allowed_transitions: allowedNextStatuses,
        },
        { status: 400 },
      );
    }

    // Update order status
    const updateData: Record<string, any> = {
      order_status: status,
    };

    // Set confirmed_at timestamp if confirming
    if (status === "confirmed") {
      updateData.confirmed_at = new Date().toISOString();
    }

    // Set completed_at timestamp if completing or delivering
    if (status === "completed" || status === "delivered") {
      updateData.completed_at = new Date().toISOString();
    }

    // Set cancelled_at timestamp if cancelling
    if (status === "cancelled") {
      updateData.cancelled_at = new Date().toISOString();
    }

    // Calculate estimated ready time if provided
    if (estimated_ready_minutes && status === "preparing") {
      const estimatedReadyTime = new Date(
        Date.now() + estimated_ready_minutes * 60 * 1000,
      );
      updateData.estimated_ready_time = estimatedReadyTime.toISOString();
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderIdNum);

    if (updateError) {
      console.error("[Tablet Order Status] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update order status" },
        { status: 500 },
      );
    }

    // Record status change in history
    const historyNotes =
      notes ||
      `Status changed to ${status} by device ${deviceContext.device_id}`;

    const { error: historyError } = await supabase
      .from("order_status_history")
      .insert({
        order_id: orderIdNum,
        order_created_at: order.created_at,
        status,
        notes: historyNotes,
        changed_by_device_id: deviceContext.device_id,
      });

    if (historyError) {
      console.warn(
        "[Tablet Order Status] Failed to record history:",
        historyError,
      );
      // Don't fail the request if history fails
    }

    // Fetch updated status history
    const { data: statusHistory } = await supabase
      .from("order_status_history")
      .select("status, notes, created_at")
      .eq("order_id", orderIdNum)
      .order("created_at", { ascending: false });

    console.log(
      `[Tablet Order Status] Order ${orderIdNum} changed from '${currentStatus}' to '${status}' by device ${deviceContext.device_id}`,
    );

    return NextResponse.json({
      success: true,
      order: {
        id: orderIdNum,
        previous_status: currentStatus,
        current_status: status,
      },
      status_history: statusHistory || [],
    });
  } catch (error: any) {
    console.error("[Tablet Order Status] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update order status" },
      { status: 500 },
    );
  }
}
