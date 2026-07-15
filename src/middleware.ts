import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-session";

const PROTECTED_PREFIXES = ["/dashboard", "/create", "/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isLogin = pathname === "/login";

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = await verifySessionToken(token);

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && user?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isLogin && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/create/:path*", "/admin/:path*", "/login"]
};
