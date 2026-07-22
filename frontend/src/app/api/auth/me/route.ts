import { NextResponse, type NextRequest } from "next/server";

import { AUTH_API_URL, AUTH_COOKIE_NAME } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const response = await fetch(`${AUTH_API_URL}/auth/me?token=${encodeURIComponent(token)}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const bodyText = await response.text();
  let body: unknown = {};

  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { detail: bodyText || "Unable to load profile." };
  }

  return NextResponse.json(body, { status: response.status });
}
