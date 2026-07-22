import { cookies } from "next/headers";

import { AUTH_API_URL, AUTH_COOKIE_NAME } from "@/lib/backend";
import type { AuthUser } from "@/types/auth";

export async function getServerSessionFromToken(token: string): Promise<AuthUser | null> {
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

    return (await response.json()) as AuthUser;
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<AuthUser | null> {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return getServerSessionFromToken(token);
}
