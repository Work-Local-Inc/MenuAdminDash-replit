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
      .from("restaurant_twilio_config")
      .select("*")
      .eq(restFk.column, restFk.value)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json(data || { phone: null, enables_calls: true });
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
    const restFk = resolveFkParam(
      params.id,
      "restaurant_id",
      "restaurant_uuid",
    );

    const { data: existing } = await supabase
      .from("restaurant_twilio_config")
      .select("id")
      .eq(restFk.column, restFk.value)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from("restaurant_twilio_config")
        .update({
          phone: body.phone || null,
          enables_calls: body.enables_calls ?? true,
        })
        .eq(restFk.column, restFk.value)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
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

      const { data, error } = await supabase
        .from("restaurant_twilio_config")
        .insert({
          restaurant_id: restaurantIntId,
          phone: body.phone || null,
          enables_calls: body.enables_calls ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("[TwilioConfig] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
