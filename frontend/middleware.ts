import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, ROLE_COOKIE_NAME } from "./lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.get(AUTH_COOKIE_NAME)?.value === "1";
  const role = request.cookies.get(ROLE_COOKIE_NAME)?.value;

  if (pathname.startsWith("/login") && isAuthenticated) {
    const targetPath = role === "employee" ? "/cart" : "/";
    return NextResponse.redirect(new URL(targetPath, request.url));
  }

  const isProtectedPath = pathname === "/" || pathname.startsWith("/cart");
  if (isProtectedPath && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/" && role === "employee") {
    return NextResponse.redirect(new URL("/cart", request.url));
  }

  if (pathname.startsWith("/cart") && role === "manager") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/cart/:path*", "/login"]
};
