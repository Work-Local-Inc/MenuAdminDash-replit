import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { AuthError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteFromR2 } from "@/lib/r2";
import { resolveIdParam } from "@/lib/utils/uuid";
import { z } from "zod";
export const dynamic = "force-dynamic";

const imageCreateSchema = z.object({
  image_url: z.string().url("Must be a valid URL"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .nullable()
    .optional(),
  display_order: z.number().int().nonnegative().optional(),
});

const imageUpdateSchema = z.object({
  description: z.string().max(500).nullable().optional(),
  display_order: z.number().int().nonnegative().optional(),
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
      .from("restaurant_images")
      .select("*")
      .eq("restaurant_id", resolved.intId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch images" },
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

    const supabase = createAdminClient() as any;
    const resolved = await resolveRestaurantIntId(supabase, params.id);
    if ("error" in resolved)
      return NextResponse.json({ error: resolved.error }, { status: 404 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid or missing request body" },
        { status: 400 },
      );
    }

    // Validate request body server-side
    const validatedData = imageCreateSchema.parse(body);

    const { data, error } = await supabase
      .from("restaurant_images")
      .insert({
        restaurant_id: resolved.intId,
        ...validatedData,
      })
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
      { error: error.message || "Failed to create image" },
      { status: 500 },
    );
  }
}

export async function PATCH(
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid or missing request body" },
        { status: 400 },
      );
    }

    if (!body.image_id) {
      return NextResponse.json(
        { error: "image_id is required" },
        { status: 400 },
      );
    }

    // Validate update data
    const validatedData = imageUpdateSchema.parse(body);

    // Ensure at least one field is being updated
    const hasValidData = Object.values(validatedData).some(
      (val) => val !== undefined,
    );
    if (!hasValidData) {
      return NextResponse.json(
        { error: "At least one field must be provided" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("restaurant_images")
      .update(validatedData)
      .eq("id", body.image_id)
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
      { error: error.message || "Failed to update image" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("image_id");

    if (!imageId) {
      return NextResponse.json(
        { error: "image_id query parameter is required" },
        { status: 400 },
      );
    }

    // First get the image to extract the Storage path for deletion
    const { data: image } = await supabase
      .from("restaurant_images")
      .select("image_url")
      .eq("id", parseInt(imageId))
      .eq("restaurant_id", resolved.intId)
      .single();

    // Delete from database
    const { error: dbError } = await supabase
      .from("restaurant_images")
      .delete()
      .eq("id", parseInt(imageId))
      .eq("restaurant_id", resolved.intId);

    if (dbError) throw dbError;

    // Delete from R2 storage
    if (image?.image_url) {
      try {
        await deleteFromR2(image.image_url);
      } catch (storageError) {
        console.error("Failed to delete from R2:", storageError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to delete image" },
      { status: 500 },
    );
  }
}
