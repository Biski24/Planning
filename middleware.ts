import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { AUTH_DISABLED } from "@/lib/flags";

const protectedPaths = ["/plannings", "/planning", "/manager", "/me", "/admin"];

export async function middleware(request: NextRequest) {
  if (AUTH_DISABLED) {
    if (request.nextUrl.pathname === "/login") {
      return NextResponse.redirect(new URL("/plannings", request.url));
    }
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? await verifySessionToken(sessionToken) : null;
  const needsAuth = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!session && needsAuth) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (session && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/plannings", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
