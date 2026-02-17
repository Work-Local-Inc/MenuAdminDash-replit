import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
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

    const access = await verifyRestaurantAccess(adminUser as any, params.id);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const supabase = createAdminClient() as any;
    const restFk = resolveFkParam(
      params.id,
      "restaurant_id",
      "restaurant_uuid",
    );

    const { data, error } = await supabase
      .from("delivery_and_pickup_configs")
      .select("*")
      .eq(restFk.column, restFk.value)
      .maybeSingle();

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
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

    // Resolve to int for insert
    const { column: restCol, value: restVal } = resolveIdParam(params.id);
    let restaurantIntId: number;
    if (restCol === "uuid") {
      const { data: rest } = await supabase
        .from("restaurants")
        .select("id")
        .eq("uuid", restVal)
        .single();
      if (!rest)
        return NextResponse.json(
          { error: "Restaurant not found" },
          { status: 404 },
        );
      restaurantIntId = rest.id;
    } else {
      restaurantIntId = restVal as number;
    }

    // Only include columns that exist in the database
    // Note: closing_warning_min does NOT exist in production DB
    const insertData: Record<string, any> = {
      restaurant_id: restaurantIntId,
    };
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
        insertData[column] = body[column];
      }
    }

    console.log("[ServiceConfig POST] Creating config:", insertData);

    const { data, error } = await supabase
      .from("delivery_and_pickup_configs")
      .insert(insertData)
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
