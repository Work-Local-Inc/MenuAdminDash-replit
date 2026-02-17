import { createLocalClient } from "@/lib/db/local-client";

// Drop-in replacement: local Postgres client with same API as Supabase admin client
export function createAdminClient() {
  return createLocalClient("menuca_v3") as any;
}
