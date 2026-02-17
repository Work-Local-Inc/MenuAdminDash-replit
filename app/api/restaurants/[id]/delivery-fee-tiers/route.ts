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
    const restaurantId = params.id;

    const access = await verifyRestaurantAccess(adminUser as any, restaurantId);
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
      .schema("menuca_v3")
      .from("restaurant_distance_based_delivery_fees")
      .select("*")
      .eq(restFk.column, restFk.value)
      .order("distance_in_km", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { adminUser } = await verifyAdminAuth(request);
    const restaurantId = params.id;

    const access = await verifyRestaurantAccess(adminUser as any, restaurantId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const supabase = createAdminClient() as any;
    const body = await request.json();
    const { tiers } = body;

    if (!Array.isArray(tiers)) {
      return NextResponse.json(
        { error: "tiers must be an array" },
        { status: 400 },
      );
    }

    const restFk = resolveFkParam(
      params.id,
      "restaurant_id",
      "restaurant_uuid",
    );

    const { error: deleteError } = await supabase
      .schema("menuca_v3")
      .from("restaurant_distance_based_delivery_fees")
      .delete()
      .eq(restFk.column, restFk.value);

    if (deleteError) throw deleteError;

    // Resolve to int for insert
    const { column: restCol, value: restVal } = resolveIdParam(params.id);
    let restId: number;
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
      restId = rest.id;
    } else {
      restId = restVal as number;
    }

    if (tiers.length > 0) {
      const insertData = tiers.map((tier: any) => ({
        restaurant_id: restId,
        distance_in_km: tier.distance_in_km,
        total_delivery_fee: tier.total_delivery_fee,
        driver_earning: tier.driver_earning,
        is_active: true,
      }));

      const { data, error: insertError } = await supabase
        .schema("menuca_v3")
        .from("restaurant_distance_based_delivery_fees")
        .insert(insertData)
        .select();

      if (insertError) throw insertError;

      return NextResponse.json(data);
    }

    return NextResponse.json([]);
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
