import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { AuthError } from "@/lib/errors";
import { resolveIdParam, resolveFkParam } from "@/lib/utils/uuid";
import { z } from "zod";
export const dynamic = "force-dynamic";

const updateAvailabilitySchema = z.object({
  hidden_days: z.array(z.number().int().min(0).max(6)),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await verifyAdminAuth(request);
    const { id } = await params;
    const supabase = createAdminClient() as any;

    let dishResolved;
    try {
      dishResolved = resolveIdParam(id);
    } catch {
      return NextResponse.json({ error: "Invalid dish ID" }, { status: 400 });
    }
    const { column: dishCol, value: dishVal } = dishResolved;

    // First check if dish exists
    const { data: dish, error: dishError } = await supabase
      .schema("menuca_v3")
      .from("dishes")
      .select("id")
      .eq(dishCol, dishVal)
      .single();

    if (dishError) {
      if (dishError.code === "PGRST116") {
        return NextResponse.json({ error: "Dish not found" }, { status: 404 });
      }
      throw dishError;
    }

    // dish_availability has dish_uuid, use resolveFkParam
    const availFk = resolveFkParam(id, "dish_id", "dish_uuid");

    // Get hidden days from dish_availability table
    const { data: availabilityData, error: availError } = await supabase
      .schema("menuca_v3")
      .from("dish_availability")
      .select("day_of_week")
      .eq(availFk.column, availFk.value)
      .eq("is_hidden", true);

    if (availError) {
      // If table doesn't exist, return empty array
      if (availError.code === "42P01") {
        return NextResponse.json({
          success: true,
          hidden_days: [],
          note: "dish_availability table not found",
        });
      }
      throw availError;
    }

    // Extract day_of_week values into an array
    const hiddenDays = (availabilityData || []).map(
      (row: { day_of_week: number }) => row.day_of_week,
    );

    return NextResponse.json({
      success: true,
      hidden_days: hiddenDays,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("Error fetching dish availability:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch availability" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await verifyAdminAuth(request);
    const { id } = await params;
    const supabase = createAdminClient() as any;

    let dishResolved;
    try {
      dishResolved = resolveIdParam(id);
    } catch {
      return NextResponse.json({ error: "Invalid dish ID" }, { status: 400 });
    }
    const { column: dishCol, value: dishVal } = dishResolved;

    const body = await request.json();
    const validatedData = updateAvailabilitySchema.parse(body);
    const newHiddenDays = validatedData.hidden_days;

    // First check if dish exists (and get integer id for inserts)
    const { data: dish, error: dishError } = await supabase
      .schema("menuca_v3")
      .from("dishes")
      .select("id")
      .eq(dishCol, dishVal)
      .single();

    if (dishError) {
      if (dishError.code === "PGRST116") {
        return NextResponse.json({ error: "Dish not found" }, { status: 404 });
      }
      throw dishError;
    }

    const dishIntId: number = dish.id;

    // dish_availability has dish_uuid, use resolveFkParam for queries
    const availFk = resolveFkParam(id, "dish_id", "dish_uuid");

    // Delete all existing availability records for this dish
    const { error: deleteError } = await supabase
      .schema("menuca_v3")
      .from("dish_availability")
      .delete()
      .eq(availFk.column, availFk.value);

    if (deleteError) {
      // If table doesn't exist, return error
      if (deleteError.code === "42P01") {
        return NextResponse.json(
          {
            success: false,
            error: "dish_availability table not found",
            hidden_days: newHiddenDays,
          },
          { status: 500 },
        );
      }
      throw deleteError;
    }

    // Insert new hidden days if any — always use integer FK for inserts
    if (newHiddenDays.length > 0) {
      const insertRows = newHiddenDays.map((day) => ({
        dish_id: dishIntId,
        day_of_week: day,
        is_hidden: true,
      }));

      const { error: insertError } = await supabase
        .schema("menuca_v3")
        .from("dish_availability")
        .insert(insertRows);

      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({
      success: true,
      hidden_days: newHiddenDays,
      message: "Availability updated successfully",
    });
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
    console.error("Error updating dish availability:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update availability" },
      { status: 500 },
    );
  }
}
