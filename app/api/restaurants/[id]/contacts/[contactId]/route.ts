import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { verifyRestaurantAccess } from "@/lib/auth/restaurant-access";
import { AuthError } from "@/lib/errors";
import { resolveIdParam, resolveFkParam } from "@/lib/utils/uuid";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } },
) {
  try {
    const { adminUser } = await verifyAdminAuth(request);

    const supabase = createAdminClient() as any;
    const { column: contactCol, value: contactVal } = resolveIdParam(
      params.contactId,
    );
    const restFk = resolveFkParam(
      params.id,
      "restaurant_id",
      "restaurant_uuid",
    );

    const access = await verifyRestaurantAccess(adminUser as any, params.id);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const body = await request.json();

    // Update restaurant_locations table for phone/email
    const locationUpdateData: any = {};
    if (body.phone !== undefined) locationUpdateData.phone = body.phone || null;
    if (body.email !== undefined) locationUpdateData.email = body.email || null;
    locationUpdateData.updated_at = new Date().toISOString();

    const { data: updatedLocation, error: updateError } = await supabase
      .from("restaurant_locations")
      .update(locationUpdateData)
      .eq(contactCol, contactVal)
      .eq(restFk.column, restFk.value)
      .select()
      .single();

    if (updateError) {
      console.error("[Update Contact] Location update error:", updateError);
      throw updateError;
    }

    console.log("[Update Contact] Location update success:", updatedLocation);
    return NextResponse.json({
      success: true,
      contact: {
        id: updatedLocation.id,
        phone: updatedLocation.phone,
        email: updatedLocation.email,
        type: "location",
      },
    });
  } catch (error: any) {
    console.error("[Update Contact] Final error:", error);
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to update contact" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } },
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

    let reason = "Deleted by admin";
    try {
      const body = await request.json();
      if (body.reason) {
        reason = body.reason;
      }
    } catch {
      // No body - use default reason
    }

    const { column: contactCol, value: contactVal } = resolveIdParam(
      params.contactId,
    );
    const restFk = resolveFkParam(
      params.id,
      "restaurant_id",
      "restaurant_uuid",
    );

    // Clear contact info from the restaurant location
    const { error } = await supabase
      .from("restaurant_locations")
      .update({
        phone: null,
        email: null,
        updated_at: new Date().toISOString(),
      })
      .eq(contactCol, contactVal)
      .eq(restFk.column, restFk.value);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Contact removed successfully",
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
