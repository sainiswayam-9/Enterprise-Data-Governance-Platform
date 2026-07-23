import type { AppRole } from "@/types/auth";

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "RBAC Control Center";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
export const AUTH_COOKIE_NAME = "rbac_auth_token";
export const AUTH_API_URL = process.env.AUTH_API_URL ?? "http://localhost:8001";
export const DATA_API_URL = process.env.DATA_API_URL ?? "http://localhost:8000";
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 8;
export const APP_ROLES: AppRole[] = ["manager", "hr", "salesperson"];
