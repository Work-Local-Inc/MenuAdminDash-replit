import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth/admin-check";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthError } from "@/lib/errors";
import { z } from "zod";
export const dynamic = "force-dynamic";

const verifySchema = z.object({
  domain_id: z.number(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Verify admin authentication (throws if unauthorized)
    await verifyAdminAuth(request);

    const domainId = parseInt(params.id);
    if (isNaN(domainId)) {
      return NextResponse.json({ error: "Invalid domain ID" }, { status: 400 });
    }

    // Validate request body
    const validated = verifySchema.parse({ domain_id: domainId });

    const supabase = createAdminClient() as any;

    // Fetch the domain record
    const { data: domain, error: fetchError } = await supabase
      .from("restaurant_domains")
      .select("*")
      .eq("id", validated.domain_id)
      .single();

    if (fetchError || !domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Update verification timestamp
    const { data, error } = await supabase
      .from("restaurant_domains")
      .update({
        last_verified_at: new Date().toISOString(),
        verification_status: "verified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", validated.domain_id)
      .select()
      .single();

    if (error) {
      console.error("[Verify Domain] Update error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to verify domain" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, domain: data });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("[Verify Domain] Unexpected error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
