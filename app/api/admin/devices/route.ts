import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { AuthError } from "@/lib/errors";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/devices
 *
 * List all devices (admin-only)
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request);

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurant_id");
    const isActive = searchParams.get("is_active");

    const supabase = createAdminClient() as any;

    let query = supabase
      .from("devices")
      .select(
        `
        id,
        uuid,
        device_name,
        restaurant_id,
        has_printing_support,
        is_active,
        last_check_at,
        last_boot_at,
        firmware_version,
        software_version,
        created_at,
        restaurants!restaurant_id (
          id,
          name
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (restaurantId) {
      query = query.eq("restaurant_id", parseInt(restaurantId));
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true");
    }

    const { data: devices, error } = await query;

    if (error) {
      console.error("[Admin Devices] Query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch devices" },
        { status: 500 },
      );
    }

    const transformedDevices = (devices || []).map((device: any) => {
      const now = Date.now();
      const lastCheckAt = device.last_check_at
        ? new Date(device.last_check_at).getTime()
        : null;
      const lastSuccessfulFetch = device.last_successful_fetch
        ? new Date(device.last_successful_fetch).getTime()
        : null;
      const consecutiveFailures = device.consecutive_fetch_failures ?? 0;
      const oldestPending = device.oldest_pending_order_minutes ?? 0;

      let health_status:
        | "healthy"
        | "warning"
        | "critical"
        | "offline"
        | "unknown" = "healthy";
      if (lastCheckAt === null) {
        health_status = "unknown";
      } else if (now - lastCheckAt > 2 * 60 * 1000) {
        health_status = "offline";
      } else if (
        (lastSuccessfulFetch !== null &&
          now - lastSuccessfulFetch > 5 * 60 * 1000) ||
        consecutiveFailures >= 3 ||
        oldestPending >= 5
      ) {
        health_status = "critical";
      } else if (
        lastSuccessfulFetch !== null &&
        now - lastSuccessfulFetch > 2 * 60 * 1000
      ) {
        health_status = "warning";
      }

      return {
        id: device.id,
        uuid: device.uuid,
        device_name: device.device_name,
        restaurant_id: device.restaurant_id,
        restaurant_name: device.restaurants?.name || null,
        has_printing_support: device.has_printing_support,
        is_active: device.is_active,
        last_check_at: device.last_check_at,
        last_boot_at: device.last_boot_at,
        firmware_version: device.firmware_version,
        software_version: device.software_version,
        created_at: device.created_at,
        last_successful_fetch: device.last_successful_fetch ?? null,
        consecutive_fetch_failures: consecutiveFailures,
        oldest_pending_order_minutes: oldestPending,
        battery_level: device.battery_level ?? null,
        printer_status: device.printer_status ?? null,
        app_version: device.app_version ?? "unknown",
        health_status,
        is_online: lastCheckAt !== null && now - lastCheckAt < 2 * 60 * 1000,
      };
    });

    return NextResponse.json(transformedDevices);
  } catch (error: any) {
    console.error("[Admin Devices] Error:", error);

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to fetch devices" },
      { status: 500 },
    );
  }
}
