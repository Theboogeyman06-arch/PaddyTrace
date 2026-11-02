import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Next.js 16 Request Interceptor (src/proxy.ts)
 * Handles locale negotiation and role-based route guard
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Enforce session check for protected officer or admin routes
  const isOfficerRoute = pathname.includes("/officer");
  const isAdminRoute = pathname.includes("/admin");

  if (isOfficerRoute || isAdminRoute) {
    const sessionCookie = request.cookies.get("paddytrace_session");
    if (!sessionCookie) {
      // Redirect to localized login
      const locale = pathname.startsWith("/en") ? "en" : "kn";
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Run next-intl localized routing
  return intlMiddleware(request);
}

// Next.js 16 convention and backwards-compatible export
export const middleware = proxy;

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

