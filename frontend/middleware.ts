import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, AUTH_API_URL } from "@/lib/backend";
import { ROUTE_ACCESS_RULES, findRouteAccessRule } from "@/lib/navigation";
import type { AppRole } from "@/types/auth";

async function readSessionRole(token: string): Promise<AppRole | null> {
  try {
    const response = await fetch(`${AUTH_API_URL}/auth/me?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const user = (await response.json()) as { role?: AppRole };
    return user.role ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const pathname = request.nextUrl.pathname;
  const protectedRule = findRouteAccessRule(pathname);

  if (!token) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const role = await readSessionRole(token);
  if (!role) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  if (protectedRule && !protectedRule.roles.includes(role)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/403";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ROUTE_ACCESS_RULES.map((rule) => rule.pattern),
};
