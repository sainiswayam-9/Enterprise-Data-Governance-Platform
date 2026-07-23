import type { LoginRequest, LoginResponse as ModelLoginResponse, Role, User } from "@/types/models";

export type AppRole = Role;
export type AuthUser = User;
export type LoginCredentials = LoginRequest;
export type LoginResponse = ModelLoginResponse;

export interface SessionState {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
}
