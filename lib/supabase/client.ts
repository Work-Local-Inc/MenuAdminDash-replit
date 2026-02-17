const COOKIE_NAME = "menu-session";

// Lightweight browser-side auth client
// Data queries are NOT done from the browser — they go through API routes
// This only provides auth state for the client-side UI
function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

function parseJwt(token: string): any {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

class BrowserAuthClient {
  auth = {
    getSession: async () => {
      const token = getTokenFromCookie();
      if (!token) return { data: { session: null }, error: null };
      const decoded = parseJwt(token);
      if (!decoded) return { data: { session: null }, error: null };
      return {
        data: {
          session: {
            access_token: token,
            user: { id: decoded.sub, email: decoded.email, role: decoded.role },
          },
        },
        error: null,
      };
    },

    getUser: async () => {
      const token = getTokenFromCookie();
      if (!token)
        return {
          data: { user: null },
          error: { message: "Not authenticated" },
        };
      const decoded = parseJwt(token);
      if (!decoded)
        return { data: { user: null }, error: { message: "Invalid token" } };
      return {
        data: {
          user: { id: decoded.sub, email: decoded.email, role: decoded.role },
        },
        error: null,
      };
    },

    signOut: async () => {
      // Call logout API to clear the httpOnly cookie
      await fetch("/api/auth/logout", { method: "POST" });
      return { error: null };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // No real-time auth state changes with JWT cookies
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  };
}

export function createClient() {
  return new BrowserAuthClient() as any;
}

export function createPublicClient() {
  return new BrowserAuthClient() as any;
}
