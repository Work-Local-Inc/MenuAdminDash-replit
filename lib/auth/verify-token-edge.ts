// Lightweight JWT verification for Edge runtime (middleware)
// Uses Web Crypto API instead of Node.js crypto

const JWT_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64UrlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return base64UrlEncode(sig);
}

export interface EdgeUser {
  id: string;
  email: string;
  role: string;
}

export async function verifyTokenEdge(token: string): Promise<EdgeUser | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;

    // Verify signature
    const expected = await hmacSign(`${header}.${payload}`, JWT_SECRET);
    if (expected !== signature) return null;

    // Decode payload
    const decoded = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payload)),
    );

    // Check expiry
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role || "authenticated",
    };
  } catch {
    return null;
  }
}

export const COOKIE_NAME = "menu-session";
