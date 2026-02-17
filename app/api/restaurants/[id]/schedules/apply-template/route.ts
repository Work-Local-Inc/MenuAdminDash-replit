import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthError } from "@/lib/errors";
import { z } from "zod";
export const dynamic = "force-dynamic";

const templateSchema = z.object({
  template_name: z.enum([
    "24/7",
    "Mon-Fri 9-5",
    "Mon-Fri 11-9, Sat-Sun 11-10",
    "Lunch & Dinner",
  ]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { adminUser } = await verifyAdminAuth(request);

    const restaurantId = parseInt(params.id);
    const access = await verifyRestaurantAccess(adminUser as any, restaurantId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const supabase = createAdminClient() as any;
    const body = await request.json();

    // Validate template name
    const validatedData = templateSchema.parse(body);

    // Use the same template logic as the onboarding apply-schedule-template route
    const SCHEDULE_TEMPLATES: Record<
      string,
      { open: string; close: string; is_closed: boolean }[][]
    > = {
      "24/7": Array(7).fill([
        { open: "00:00", close: "23:59", is_closed: false },
      ]),
      "Mon-Fri 9-5": [
        [{ open: "00:00", close: "00:00", is_closed: true }], // Sun
        [{ open: "09:00", close: "17:00", is_closed: false }], // Mon
        [{ open: "09:00", close: "17:00", is_closed: false }], // Tue
        [{ open: "09:00", close: "17:00", is_closed: false }], // Wed
        [{ open: "09:00", close: "17:00", is_closed: false }], // Thu
        [{ open: "09:00", close: "17:00", is_closed: false }], // Fri
        [{ open: "00:00", close: "00:00", is_closed: true }], // Sat
      ],
      "Mon-Fri 11-9, Sat-Sun 11-10": [
        [{ open: "11:00", close: "22:00", is_closed: false }], // Sun
        [{ open: "11:00", close: "21:00", is_closed: false }], // Mon
        [{ open: "11:00", close: "21:00", is_closed: false }], // Tue
        [{ open: "11:00", close: "21:00", is_closed: false }], // Wed
        [{ open: "11:00", close: "21:00", is_closed: false }], // Thu
        [{ open: "11:00", close: "21:00", is_closed: false }], // Fri
        [{ open: "11:00", close: "22:00", is_closed: false }], // Sat
      ],
      "Lunch & Dinner": Array(7).fill([
        { open: "11:00", close: "14:00", is_closed: false },
        { open: "17:00", close: "21:00", is_closed: false },
      ]),
    };

    const template = SCHEDULE_TEMPLATES[validatedData.template_name];
    if (!template) {
      return NextResponse.json(
        { error: "Invalid template name" },
        { status: 400 },
      );
    }

    const rid = parseInt(params.id);

    // Delete existing schedules
    await supabase
      .from("restaurant_schedules")
      .delete()
      .eq("restaurant_id", rid);

    // Insert new schedules
    const records = template.flatMap((slots, dayOfWeek) =>
      slots.map((slot) => ({
        restaurant_id: rid,
        day_of_week: dayOfWeek,
        open_time: slot.open,
        close_time: slot.close,
        is_closed: slot.is_closed,
      })),
    );

    const { data, error } = await supabase
      .from("restaurant_schedules")
      .insert(records)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      schedules: data,
      message: `${validatedData.template_name} schedule applied successfully`,
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
        {
          error: "Invalid template name",
          details: error.errors,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: error.message || "Failed to apply schedule template",
      },
      { status: 500 },
    );
  }
}
