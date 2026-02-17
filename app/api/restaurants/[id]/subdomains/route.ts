import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthError } from "@/lib/errors";
import { z } from "zod";
import { invalidateCache } from "@/lib/subdomain-mapping";
import { resolveIdParam, resolveFkParam } from "@/lib/utils/uuid";
export const dynamic = "force-dynamic";

const subdomainSchema = z.object({
  subdomain: z
    .string()
    .min(1, "Subdomain is required")
    .regex(
      /^[a-z0-9]+([\.\-][a-z0-9]+)*$/,
      "Invalid subdomain format (lowercase letters, numbers, dots, and hyphens only)",
    ),
  slug: z.string().min(1, "Slug is required"),
  name: z.string().min(1, "Name is required"),
  is_primary: z.boolean().default(false),
  is_active: z.boolean().default(true),
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

    const supabase = createAdminClient() as any;
    const restFk = resolveFkParam(
      params.id,
      "restaurant_id",
      "restaurant_uuid",
    );

    const { data, error } = await supabase
      .schema("menuca_v3")
      .from("restaurant_subdomains")
      .select("*")
      .eq(restFk.column, restFk.value)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Subdomains GET] Error:", error);
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("[Subdomains GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch subdomains" },
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
    const body = await request.json();

    const validatedData = subdomainSchema.parse(body);

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
      .schema("menuca_v3")
      .from("restaurant_subdomains")
      .insert({
        restaurant_id: restaurantIntId,
        subdomain: validatedData.subdomain.toLowerCase(),
        slug: validatedData.slug,
        name: validatedData.name,
        is_primary: validatedData.is_primary,
        is_active: validatedData.is_active,
      })
      .select()
      .single();

    if (error) {
      console.error("[Subdomains POST] Error:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This subdomain is already in use" },
          { status: 400 },
        );
      }
      throw error;
    }

    invalidateCache();

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
    console.error("[Subdomains POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create subdomain" },
      { status: 500 },
    );
  }
}
