import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { AuthError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveFkParam } from "@/lib/utils/uuid";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { adminUser } = await verifyAdminAuth(request);

    const supabase = createAdminClient() as any;

    const access = await verifyRestaurantAccess(adminUser as any, params.id);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const restFk = resolveFkParam(
      params.id,
      "restaurant_id",
      "restaurant_uuid",
    );

    // Get courses from menuca_v3 schema
    const { data: courses, error: coursesError } = await supabase
      .schema("menuca_v3")
      .from("courses")
      .select("id, name, description, display_order, is_active")
      .eq(restFk.column, restFk.value)
      .order("display_order", { ascending: true });

    if (coursesError) throw coursesError;

    // Get dish counts from menuca_v3 schema
    const { data: dishCounts, error: countError } = await supabase
      .schema("menuca_v3")
      .from("dishes")
      .select("course_id")
      .eq(restFk.column, restFk.value);

    if (countError) throw countError;

    // Build count map
    const countMap = new Map<number, number>();
    dishCounts?.forEach((dish: any) => {
      if (dish.course_id) {
        countMap.set(dish.course_id, (countMap.get(dish.course_id) || 0) + 1);
      }
    });

    // Merge counts with courses
    const coursesWithCounts = (courses || []).map((course: any) => ({
      ...course,
      dish_count: countMap.get(course.id) || 0,
    }));

    return NextResponse.json(coursesWithCounts);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch menu categories" },
      { status: 500 },
    );
  }
}
