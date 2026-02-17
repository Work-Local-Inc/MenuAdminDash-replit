import { NextRequest, NextResponse } from "next/server";
import { signInWithPassword, setSessionCookie } from "@/lib/auth/local-auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const { data, error } = await signInWithPassword(email, password);

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Login failed" },
        { status: 401 },
      );
    }

    const cookie = setSessionCookie(data.session.access_token);
    const response = NextResponse.json(
      { success: true, user: { id: data.user.id, email: data.user.email } },
      { status: 200 },
    );

    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (err: any) {
    console.error("[API Login] Error:", err.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
