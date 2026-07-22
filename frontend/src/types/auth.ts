export type AppRole = "manager" | "hr" | "salesperson";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: AppRole;
  is_active: boolean;
  created_by?: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  username: string;
  role: AppRole;
  user_id: string;
}

export interface SessionState {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
}
