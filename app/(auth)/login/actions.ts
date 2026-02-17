"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { signInWithPassword, setSessionCookie } from "@/lib/auth/local-auth";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  console.log(`[Login] Attempting login for: ${email}`);

  const { data, error } = await signInWithPassword(email, password);

  if (error || !data) {
    console.error(`[Login] FAILED for ${email}:`, error?.message);
    return { error: error?.message || "Login failed" };
  }

  console.log(`[Login] SUCCESS for ${email}, user_id: ${data.user.id}`);

  // Set session cookie
  const cookieStore = await cookies();
  const cookie = setSessionCookie(data.session.access_token);
  cookieStore.set(cookie.name, cookie.value, cookie.options);

  revalidatePath("/", "layout");
  redirect("/admin/dashboard");
}
