import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { getUserFromRequest, type LocalUser } from "@/lib/auth/local-auth";

export interface AdminUser {
  id: number;
  uuid: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role_id: number;
}

export interface AdminAuthResult {
  user: LocalUser & { id: string };
  adminUser: AdminUser;
}

export async function verifyAdminAuth(
  request: NextRequest,
): Promise<AdminAuthResult> {
  // Step 1: Check local JWT auth
  const user = await getUserFromRequest(request);

  if (!user) {
    console.error("[Admin Auth] Not authenticated: no valid session token");
    throw new UnauthorizedError("Unauthorized - authentication required");
  }

  console.log(`[Admin Auth] Authenticated user: ${user.email} (${user.id})`);

  // Step 2: Verify user exists in admin_users table
  const adminSupabase = createAdminClient();

  // Try auth_user_id first
  let adminUser = null;

  const { data: authIdMatch, error: authIdError } = await adminSupabase
    .from("admin_users")
    .select("id, uuid, email, first_name, last_name, role_id")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (authIdMatch) {
    adminUser = authIdMatch;
  } else if (user.email) {
    // Fallback to email match
    const { data: emailMatch } = await adminSupabase
      .from("admin_users")
      .select("id, uuid, email, first_name, last_name, role_id")
      .eq("email", user.email)
      .is("deleted_at", null)
      .single();

    adminUser = emailMatch;
  }

  if (!adminUser) {
    console.error("[Admin Auth] User not found in admin_users:", {
      auth_user_id: user.id,
      email: user.email,
    });
    throw new ForbiddenError("Forbidden - admin access required");
  }

  return {
    user: user as LocalUser & { id: string },
    adminUser,
  };
}
