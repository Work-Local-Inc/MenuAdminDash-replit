import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthError } from "@/lib/errors";
import { resolveIdParam, resolveFkParam } from "@/lib/utils/uuid";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; configId: string } },
) {
  try {
    // Verify admin authentication before allowing config changes
    const { adminUser } = await verifyAdminAuth(request);

    const access = await verifyRestaurantAccess(adminUser as any, params.id);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const supabase = createAdminClient() as any;
    const body = await request.json();
    const { column: cfgCol, value: cfgVal } = resolveIdParam(params.configId);
    const restFk = resolveFkParam(
      params.id,
      "restaurant_id",
      "restaurant_uuid",
    );

    // Only include columns that exist in the database
    // Note: closing_warning_min does NOT exist in production DB
    const updateData: Record<string, any> = {};
    const allowedColumns = [
      "has_delivery_enabled",
      "pickup_enabled",
      "distance_based_delivery_fee",
      "takeout_time_minutes",
      "busy_takeout_time_minutes",
      "busy_mode_enabled",
      "peak_hours",
      "twilio_call",
      "accepts_tips",
      "payment_mode",
      "commission_enabled",
      "commission_rate",
      "commission_base",
    ];

    for (const column of allowedColumns) {
      if (column in body) {
        updateData[column] = body[column];
      }
    }

    console.log("[ServiceConfig PATCH] Updating config:", updateData);

    const { data, error } = await supabase
      .from("delivery_and_pickup_configs")
      .update(updateData)
      .eq(cfgCol, cfgVal)
      .eq(restFk.column, restFk.value)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; configId: string } },
) {
  try {
    // Verify admin authentication before allowing config deletion
    const { adminUser } = await verifyAdminAuth(request);

    const access = await verifyRestaurantAccess(adminUser as any, params.id);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const supabase = createAdminClient() as any;
    const { column: cfgCol, value: cfgVal } = resolveIdParam(params.configId);
    const restFk = resolveFkParam(
      params.id,
      "restaurant_id",
      "restaurant_uuid",
    );

    const { error } = await supabase
      .from("delivery_and_pickup_configs")
      .delete()
      .eq(cfgCol, cfgVal)
      .eq(restFk.column, restFk.value);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
