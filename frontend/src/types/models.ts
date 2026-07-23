export type Role = "manager" | "hr" | "salesperson";

export type Permission =
  | "dashboard:read"
  | "data:read"
  | "data:download"
  | "data:upload"
  | "data:mutate"
  | "change-requests:read"
  | "change-requests:manage"
  | "users:read"
  | "users:manage"
  | "reports:read"
  | "settings:read";

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_by?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  username: string;
  role: Role;
  user_id: string;
}
