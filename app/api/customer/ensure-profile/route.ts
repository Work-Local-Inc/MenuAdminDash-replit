import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
export const dynamic = "force-dynamic";

let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (_stripe === null) {
    const key =
      process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
    _stripe = key ? new Stripe(key, {}) : null;
  }
  return _stripe;
}

export async function POST(request: NextRequest) {
  try {
    const supabaseClient = await createClient();
    const {
      data: { user: sessionUser },
      error: sessionError,
    } = await supabaseClient.auth.getUser();

    if (sessionError || !sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { auth_user_id, email, phone, first_name, last_name } = body;

    if (sessionUser.id !== auth_user_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminSupabase = createAdminClient() as any;

    let existingUser = null;

    const { data: byAuthId } = await adminSupabase
      .from("users")
      .select(
        "id, email, phone, first_name, last_name, auth_user_id, stripe_customer_id",
      )
      .eq("auth_user_id", auth_user_id)
      .maybeSingle();

    if (byAuthId) {
      existingUser = byAuthId;
    }

    if (!existingUser && email) {
      const { data: byEmail } = await adminSupabase
        .from("users")
        .select(
          "id, email, phone, first_name, last_name, auth_user_id, stripe_customer_id",
        )
        .eq("email", email)
        .maybeSingle();
      if (byEmail) existingUser = byEmail;
    }

    if (!existingUser && phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      const phoneVariants = [phone, cleanPhone, "+" + cleanPhone];
      if (cleanPhone.startsWith("1") && cleanPhone.length === 11) {
        phoneVariants.push(cleanPhone.substring(1));
      }
      for (const pv of phoneVariants) {
        const { data: byPhone } = await adminSupabase
          .from("users")
          .select(
            "id, email, phone, first_name, last_name, auth_user_id, stripe_customer_id",
          )
          .eq("phone", pv)
          .maybeSingle();
        if (byPhone) {
          existingUser = byPhone;
          break;
        }
      }
    }

    if (existingUser) {
      const updateData: Record<string, any> = {};
      if (!existingUser.auth_user_id) updateData.auth_user_id = auth_user_id;
      if (!existingUser.phone && phone) updateData.phone = phone;
      if (!existingUser.email && email) updateData.email = email;
      if (!existingUser.first_name && first_name)
        updateData.first_name = first_name;
      if (!existingUser.last_name && last_name)
        updateData.last_name = last_name;

      if (Object.keys(updateData).length > 0) {
        await adminSupabase
          .from("users")
          .update(updateData)
          .eq("id", existingUser.id);
        console.log(
          "[Ensure Profile] Updated existing user:",
          existingUser.id,
          Object.keys(updateData),
        );
      }

      return NextResponse.json(
        { userId: existingUser.id, action: "linked" },
        { status: 200 },
      );
    }

    const insertData: Record<string, any> = {
      auth_user_id,
      phone: phone || null,
      email: email || null,
      first_name: first_name || null,
      last_name: last_name || null,
    };

    const { data: newUser, error: insertError } = await adminSupabase
      .from("users")
      .insert(insertData)
      .select("id")
      .single();

    if (insertError || !newUser) {
      console.error("[Ensure Profile] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create user record" },
        { status: 500 },
      );
    }

    console.log("[Ensure Profile] Created new user:", newUser.id);

    const stripe = getStripe();
    if (stripe && (email || phone)) {
      try {
        const customer = await stripe.customers.create({
          email: email || undefined,
          phone: phone || undefined,
          name:
            first_name && last_name ? `${first_name} ${last_name}` : undefined,
          metadata: {
            user_id: String(newUser.id),
            auth_user_id,
          },
        });
        await adminSupabase
          .from("users")
          .update({ stripe_customer_id: customer.id })
          .eq("id", newUser.id);
        console.log("[Ensure Profile] Created Stripe customer:", customer.id);
      } catch (stripeErr: any) {
        console.error(
          "[Ensure Profile] Stripe customer creation failed (non-blocking):",
          stripeErr.message,
        );
      }
    }

    return NextResponse.json(
      { userId: newUser.id, action: "created" },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[Ensure Profile] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
