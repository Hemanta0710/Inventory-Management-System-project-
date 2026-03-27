import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, ROLE_COOKIE_NAME, resolveLoginRole } from "../../../../lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const role = resolveLoginRole(username, password);
  if (!role) {
    return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, role });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  response.cookies.set({
    name: ROLE_COOKIE_NAME,
    value: role,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });

  return response;
}
