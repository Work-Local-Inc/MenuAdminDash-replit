import { NextResponse, type NextRequest } from "next/server";
import {
  extractSubdomain,
  getRestaurantBySubdomainAsync,
} from "@/lib/subdomain-mapping";
import { verifyTokenEdge, COOKIE_NAME } from "@/lib/auth/verify-token-edge";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const originalHost = request.headers.get("x-original-host");
  const rawHostname = originalHost || request.headers.get("host") || "";
  const hostname = rawHostname.split(":")[0];

  // Allow Railway healthchecks through without subdomain routing
  if (hostname === "healthcheck.railway.app") {
    return NextResponse.next();
  }

  // --- SUBDOMAIN ROUTING ---
  const subdomain = extractSubdomain(hostname);

  console.log(
    `[Middleware] Host: ${rawHostname}, Hostname: ${hostname}, Subdomain: ${subdomain}, Path: ${pathname}`,
  );

  if (subdomain) {
    console.log(`[Middleware] Looking up subdomain: ${subdomain}`);
    const mapping = await getRestaurantBySubdomainAsync(subdomain);
    console.log(
      `[Middleware] Mapping result:`,
      mapping ? `Found: ${mapping.slug}` : "NOT FOUND",
    );

    if (mapping) {
      if (pathname.startsWith("/admin") || pathname === "/login") {
        const url = new URL(`https://menuai.ca${pathname}`);
        return NextResponse.redirect(url);
      }

      if (pathname === "/" || pathname === "") {
        const url = request.nextUrl.clone();
        url.pathname = `/r/${mapping.slug}`;
        console.log(`[Middleware] Rewriting ${subdomain} to ${url.pathname}`);
        const response = NextResponse.rewrite(url);
        response.headers.set("x-subdomain-rewrite", "true");
        return response;
      }

      return NextResponse.next();
    } else {
      console.log(`[Middleware] Unknown subdomain: ${subdomain}`);
    }
  }

  // --- ADMIN/AUTH ROUTES (for main domain only) ---
  if (!pathname.startsWith("/admin") && pathname !== "/login") {
    return NextResponse.next();
  }

  // Check local JWT session
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifyTokenEdge(token) : null;

  // If accessing /login with a valid session, redirect to dashboard
  if (pathname === "/login" && user) {
    const redirectUrl = new URL("/admin/dashboard", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
