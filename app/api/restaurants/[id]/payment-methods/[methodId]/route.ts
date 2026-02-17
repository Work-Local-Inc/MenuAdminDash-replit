import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthError } from "@/lib/errors";
import { resolveIdParam } from "@/lib/utils/uuid";
import { z } from "zod";
export const dynamic = "force-dynamic";

const paymentMethodUpdateSchema = z.object({
  payment_provider: z
    .enum(["stripe", "square", "paypal", "cash", "interac"])
    .optional(),
  provider_account_id: z.string().optional(),
  is_active: z.boolean().optional(),
});

async function resolveRestaurantIntId(
  supabase: any,
  paramId: string,
): Promise<{ intId: number } | { error: string }> {
  const { column, value } = resolveIdParam(paramId);
  if (column === "uuid") {
    const { data: rest } = await supabase
      .from("restaurants")
      .select("id")
      .eq("uuid", value)
      .single();
    if (!rest) return { error: "Restaurant not found" };
    return { intId: rest.id };
  }
  return { intId: value as number };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; methodId: string } },
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

    // Validate request body
    const validatedData = paymentMethodUpdateSchema.parse(body);

    const resolved = await resolveRestaurantIntId(supabase, params.id);
    if ("error" in resolved)
      return NextResponse.json({ error: resolved.error }, { status: 404 });

    const { data, error } = await supabase
      .from("restaurant_payment_methods")
      .update(validatedData)
      .eq("id", parseInt(params.methodId))
      .eq("restaurant_id", resolved.intId)
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to update payment method" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; methodId: string } },
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
    const resolved = await resolveRestaurantIntId(supabase, params.id);
    if ("error" in resolved)
      return NextResponse.json({ error: resolved.error }, { status: 404 });

    const { error } = await supabase
      .from("restaurant_payment_methods")
      .delete()
      .eq("id", parseInt(params.methodId))
      .eq("restaurant_id", resolved.intId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to delete payment method" },
      { status: 500 },
    );
  }
}
