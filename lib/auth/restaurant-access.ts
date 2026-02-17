import { createAdminClient } from "@/lib/supabase/admin";
import { isUUID } from "@/lib/utils/uuid";

interface AdminUser {
  id: number;
  role_id: number;
}

/**
 * Check if an admin user has access to a specific restaurant
 * - Super Admin (role_id=1): Always has access
 * - Restaurant Admin (role_id=2): Must be in admin_user_restaurants
 */
export async function checkRestaurantAccess(
  adminUser: AdminUser,
  restaurantId: number | string,
): Promise<{ hasAccess: boolean; error?: string }> {
  // Super Admin has access to all restaurants
  if (adminUser.role_id === 1) {
    return { hasAccess: true };
  }

  // Restaurant Admin - check assignments
  const supabase = createAdminClient();
  const strId = String(restaurantId);

  if (isUUID(strId)) {
    const { data: assignment, error } = await (supabase as any)
      .schema("menuca_v3")
      .from("admin_user_restaurants")
      .select("id")
      .eq("admin_user_id", adminUser.id)
      .eq("restaurant_uuid", strId)
      .single();

    if (error || !assignment) {
      return { hasAccess: false, error: "Access denied to this restaurant" };
    }
    return { hasAccess: true };
  }

  const restId =
    typeof restaurantId === "string"
      ? parseInt(restaurantId, 10)
      : restaurantId;

  if (isNaN(restId)) {
    return { hasAccess: false, error: "Invalid restaurant ID" };
  }

  const { data: assignment, error } = await (supabase as any)
    .schema("menuca_v3")
    .from("admin_user_restaurants")
    .select("id")
    .eq("admin_user_id", adminUser.id)
    .eq("restaurant_id", restId)
    .single();

  if (error || !assignment) {
    return { hasAccess: false, error: "Access denied to this restaurant" };
  }

  return { hasAccess: true };
}

/**
 * Get all restaurant IDs an admin has access to
 * Returns undefined for Super Admin (meaning "all")
 * Returns empty array for Restaurant Admin with no assignments
 */
export async function getAdminRestaurantIds(
  adminUser: AdminUser,
): Promise<number[] | undefined> {
  // Super Admin has access to all
  if (adminUser.role_id === 1) {
    return undefined;
  }

  const supabase = createAdminClient();

  const { data: assignments, error } = await (supabase as any)
    .schema("menuca_v3")
    .from("admin_user_restaurants")
    .select("restaurant_id")
    .eq("admin_user_id", adminUser.id);

  if (error) {
    console.error("Failed to fetch restaurant assignments:", error);
    return [];
  }

  return (assignments || []).map(
    (a: { restaurant_id: number }) => a.restaurant_id,
  );
}

/**
 * Verify restaurant access and return appropriate HTTP response data if denied
 * Utility for API routes to reduce boilerplate
 */
export async function verifyRestaurantAccess(
  adminUser: AdminUser,
  restaurantId: number | string,
): Promise<
  { allowed: true } | { allowed: false; status: number; error: string }
> {
  const { hasAccess, error } = await checkRestaurantAccess(
    adminUser,
    restaurantId,
  );

  if (!hasAccess) {
    return {
      allowed: false,
      status: 403,
      error: error || "Access denied to this restaurant",
    };
  }

  return { allowed: true };
}
