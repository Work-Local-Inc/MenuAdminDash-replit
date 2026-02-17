import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { AuthError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
export const dynamic = "force-dynamic";

const copyMenuSchema = z.object({
  target_restaurant_id: z.number(),
  source_restaurant_id: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request);

    const body = await request.json();
    const validatedData = copyMenuSchema.parse(body);

    const supabase = createAdminClient() as any;

    // Copy menu from source restaurant to target
    // 1. Get all courses from source
    const { data: courses, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("restaurant_id", validatedData.source_restaurant_id)
      .order("display_order");

    if (courseError) throw courseError;

    const courseIdMap: Record<number, number> = {};

    // 2. Create courses in target
    for (const course of courses || []) {
      const { id, restaurant_id, created_at, updated_at, ...courseData } =
        course;
      const { data: newCourse, error: insertError } = await supabase
        .from("courses")
        .insert({
          ...courseData,
          restaurant_id: validatedData.target_restaurant_id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      courseIdMap[id] = newCourse.id;
    }

    // 3. Get all dishes from source
    const { data: dishes, error: dishError } = await supabase
      .from("dishes")
      .select("*")
      .eq("restaurant_id", validatedData.source_restaurant_id);

    if (dishError) throw dishError;

    let copiedDishes = 0;
    for (const dish of dishes || []) {
      const {
        id,
        restaurant_id,
        course_id,
        created_at,
        updated_at,
        ...dishData
      } = dish;
      const { error: insertError } = await supabase.from("dishes").insert({
        ...dishData,
        restaurant_id: validatedData.target_restaurant_id,
        course_id: course_id ? courseIdMap[course_id] || null : null,
      });

      if (!insertError) copiedDishes++;
    }

    return NextResponse.json({
      success: true,
      courses_copied: Object.keys(courseIdMap).length,
      dishes_copied: copiedDishes,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Copy franchise menu error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to copy franchise menu" },
      { status: 500 },
    );
  }
}
