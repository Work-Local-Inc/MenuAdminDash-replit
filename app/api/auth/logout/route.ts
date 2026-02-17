import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/local-auth";

export async function POST() {
  const cookie = clearSessionCookie();
  const response = NextResponse.json({ success: true });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
