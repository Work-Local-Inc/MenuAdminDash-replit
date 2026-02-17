import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { AuthError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
export const dynamic = "force-dynamic";

const addCuisineSchema = z.object({
  cuisine_name: z.string().min(1, "Cuisine name is required"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { adminUser } = await verifyAdminAuth(request);

    const restaurantId = parseInt(params.id);
    if (isNaN(restaurantId)) {
      return NextResponse.json(
        { error: "Invalid restaurant ID" },
        { status: 400 },
      );
    }

    const access = await verifyRestaurantAccess(adminUser as any, restaurantId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const supabase = createAdminClient();

    // Get cuisines for the restaurant
    const { data: cuisines, error } = await supabase
      .from("restaurant_cuisines")
      .select(
        `
        is_primary,
        cuisine_types (
          id,
          name,
          slug
        )
      `,
      )
      .eq("restaurant_id", restaurantId)
      .order("is_primary", { ascending: false });

    if (error) throw error;

    return NextResponse.json(cuisines || []);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("Error fetching restaurant cuisines:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch cuisines" },
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

    const restaurantId = parseInt(params.id);
    if (isNaN(restaurantId)) {
      return NextResponse.json(
        { error: "Invalid restaurant ID" },
        { status: 400 },
      );
    }

    const access = await verifyRestaurantAccess(adminUser as any, restaurantId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const body = await request.json();
    const validatedData = addCuisineSchema.parse(body);

    const supabase = createAdminClient();

    // Look up cuisine_type_id from name
    const { data: cuisine, error: lookupError } = await supabase
      .from("cuisine_types")
      .select("id")
      .eq("name", validatedData.cuisine_name)
      .eq("is_active", true)
      .single();

    if (lookupError || !cuisine) {
      return NextResponse.json(
        { error: "Cuisine type not found" },
        { status: 404 },
      );
    }

    // Check if already assigned
    const { data: existing } = await supabase
      .from("restaurant_cuisines")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("cuisine_type_id", cuisine.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Cuisine already assigned" },
        { status: 409 },
      );
    }

    // Check if this is the first cuisine (make it primary)
    const { count } = await supabase
      .from("restaurant_cuisines")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId);

    const isPrimary = (count ?? 0) === 0;

    // Insert the cuisine assignment
    const { data, error } = await supabase
      .from("restaurant_cuisines")
      .insert({
        restaurant_id: restaurantId,
        cuisine_type_id: cuisine.id,
        is_primary: isPrimary,
      })
      .select(
        `
        is_primary,
        cuisine_types (
          id,
          name,
          slug
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
    console.error("Error adding cuisine:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to add cuisine" },
      { status: 500 },
    );
  }
}
