import { NextResponse, type NextRequest } from "next/server";

import { AUTH_API_URL, AUTH_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from "@/lib/backend";
import type { LoginResponse } from "@/types/auth";

export async function POST(request: NextRequest) {
  let payload: unknown = {};

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
  }

  const response = await fetch(`${AUTH_API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const bodyText = await response.text();
  let body: unknown = {};

  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { detail: bodyText || "Authentication failed." };
  }

  if (!response.ok) {
    return NextResponse.json(body, { status: response.status });
  }

  const loginResponse = body as LoginResponse & { access_token: string };
  const safeUser = {
    username: loginResponse.username,
    role: loginResponse.role,
    user_id: loginResponse.user_id,
  };

  const nextResponse = NextResponse.json(safeUser, { status: 200 });
  nextResponse.cookies.set(AUTH_COOKIE_NAME, loginResponse.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });

  return nextResponse;
}
