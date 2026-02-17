import { createLocalClient } from "@/lib/db/local-client";
import { getSessionFromCookies } from "@/lib/auth/local-auth";

// Drop-in replacement for Supabase server client
// Data queries go to local Postgres, auth uses local JWT
export async function createClient() {
  const client = createLocalClient("menuca_v3") as any;
  const { user, session } = await getSessionFromCookies();

  // Override auth methods with local auth
  client.auth = {
    getUser: async () => {
      if (!user)
        return {
          data: { user: null },
          error: { message: "Not authenticated" },
        };
      return {
        data: { user: { id: user.id, email: user.email, role: user.role } },
        error: null,
      };
    },
    getSession: async () => {
      return { data: { session }, error: null };
    },
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  };

  return client;
}
