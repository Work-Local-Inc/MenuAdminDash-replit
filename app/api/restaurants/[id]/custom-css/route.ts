import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthError } from "@/lib/errors";
import { resolveIdParam } from "@/lib/utils/uuid";
import { z } from "zod";
export const dynamic = "force-dynamic";

const customCssSchema = z.object({
  css_code: z.string().max(10000, "CSS code must be under 10,000 characters"),
  is_enabled: z.boolean().optional(),
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
    const resolved = await resolveRestaurantIntId(supabase, params.id);
    if ("error" in resolved)
      return NextResponse.json({ error: resolved.error }, { status: 404 });

    const { data, error } = await supabase
      .from("restaurant_custom_css")
      .select("*")
      .eq("restaurant_id", resolved.intId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      throw error;
    }

    // Return empty object if no custom CSS exists yet
    return NextResponse.json(
      data || {
        restaurant_id: resolved.intId,
        css_code: "",
        is_enabled: false,
        updated_at: null,
      },
    );
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch custom CSS",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
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
    const validatedData = customCssSchema.parse(body);

    const resolved = await resolveRestaurantIntId(supabase, params.id);
    if ("error" in resolved)
      return NextResponse.json({ error: resolved.error }, { status: 404 });

    // Check if record exists
    const { data: existing } = await supabase
      .from("restaurant_custom_css")
      .select("id")
      .eq("restaurant_id", resolved.intId)
      .single();

    let result;

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from("restaurant_custom_css")
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq("restaurant_id", resolved.intId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from("restaurant_custom_css")
        .insert({
          restaurant_id: resolved.intId,
          ...validatedData,
          updated_at: new Date().toISOString(),
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: error.message || "Failed to save custom CSS",
      },
      { status: 500 },
    );
  }
}
