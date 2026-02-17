import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { AuthError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveIdParam, resolveFkParam } from "@/lib/utils/uuid";
import { z } from "zod";
export const dynamic = "force-dynamic";

const addTagSchema = z.object({
  tag_name: z.string().min(1, "Tag name is required"),
});

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

    const supabase = createAdminClient();
    const restFk = resolveFkParam(
      params.id,
      "restaurant_id",
      "restaurant_uuid",
    );

    // Get tags for the restaurant
    const { data: tags, error } = await supabase
      .from("restaurant_tag_assignments")
      .select(
        `
        restaurant_tags (
          id,
          name,
          slug,
          category
        )
      `,
      )
      .eq(restFk.column, restFk.value);

    if (error) throw error;

    return NextResponse.json(tags || []);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("Error fetching restaurant tags:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tags" },
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

    const access = await verifyRestaurantAccess(adminUser as any, params.id);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const body = await request.json();
    const validatedData = addTagSchema.parse(body);

    const supabase = createAdminClient();
    const restFk = resolveFkParam(
      params.id,
      "restaurant_id",
      "restaurant_uuid",
    );

    // Look up tag by name
    const { data: tag, error: lookupError } = await supabase
      .from("restaurant_tags")
      .select("id")
      .eq("name", validatedData.tag_name)
      .eq("is_active", true)
      .single();

    if (lookupError || !tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Check if already assigned
    const { data: existing } = await supabase
      .from("restaurant_tag_assignments")
      .select("id")
      .eq(restFk.column, restFk.value)
      .eq("tag_id", tag.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Tag already assigned" },
        { status: 409 },
      );
    }

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

    // Insert the tag assignment
    const { data, error } = await supabase
      .from("restaurant_tag_assignments")
      .insert({
        restaurant_id: restaurantIntId,
        tag_id: tag.id,
      })
      .select(
        `
        restaurant_tags (
          id,
          name,
          slug,
          category
        )
      `,
      )
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("Error adding tag:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to add tag" },
      { status: 500 },
    );
  }
}
