import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { localPool } from "@/lib/db/local-client";

const JWT_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const COOKIE_NAME = "menu-session";
const TOKEN_EXPIRY = "7d";

export interface LocalUser {
  id: string;
  email: string;
  role: string;
}

export interface LocalSession {
  user: LocalUser;
  access_token: string;
  expires_at: number;
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{
  data: { user: LocalUser; session: LocalSession } | null;
  error: any;
}> {
  try {
    const res = await localPool().query(
      `SELECT id, email, encrypted_password FROM auth.users WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    );

    if (res.rows.length === 0) {
      return { data: null, error: { message: "Invalid login credentials" } };
    }

    const authUser = res.rows[0];

    const valid = await bcrypt.compare(password, authUser.encrypted_password);
    if (!valid) {
      return { data: null, error: { message: "Invalid login credentials" } };
    }

    const user: LocalUser = {
      id: authUser.id,
      email: authUser.email,
      role: "authenticated",
    };

    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY },
    );

    const session: LocalSession = {
      user,
      access_token: token,
      expires_at: expiresAt,
    };

    return { data: { user, session }, error: null };
  } catch (err: any) {
    console.error("[LocalAuth] signInWithPassword error:", err.message);
    return { data: null, error: { message: err.message } };
  }
}

export function createToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email, role: "authenticated" }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

export function verifyToken(token: string): LocalUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role || "authenticated",
    };
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<{
  user: LocalUser | null;
  session: any | null;
}> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return { user: null, session: null };
    }

    const user = verifyToken(token);
    if (!user) {
      return { user: null, session: null };
    }

    return { user, session: { access_token: token, user } };
  } catch {
    return { user: null, session: null };
  }
}

export async function getUserFromRequest(
  request: Request,
): Promise<LocalUser | null> {
  // Check cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (match) {
    return verifyToken(match[1]);
  }

  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifyToken(authHeader.slice(7));
  }

  return null;
}

export function setSessionCookie(token: string): {
  name: string;
  value: string;
  options: any;
} {
  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    },
  };
}

export function clearSessionCookie(): {
  name: string;
  value: string;
  options: any;
} {
  return {
    name: COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    },
  };
}

export { COOKIE_NAME, JWT_SECRET };
