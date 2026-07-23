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
  created_at?: string | null;
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

// ── User management ───────────────────────────────────────────────────────────

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  role?: Role;
}

// ── Data service ──────────────────────────────────────────────────────────────

export interface CategoryOverview {
  category: string;
  document_count: number;
  fields: string[];
}

export interface DataOverviewResponse {
  categories: CategoryOverview[];
  total: number;
}

export interface CategoriesResponse {
  predefined: string[];
  existing: string[];
  all: string[];
  note: string;
}

/** A single data document — field values are dynamic */
export type DataDocument = Record<string, unknown> & { id: string };

export interface PaginatedDataResponse {
  category: string;
  query?: string;
  field?: string;
  total_found: number;
  page: number;
  page_size: number;
  total_pages: number;
  data: DataDocument[];
}

// ── Change requests ───────────────────────────────────────────────────────────

export interface ChangeRequest {
  id: string;
  requester: string;
  category: string;
  doc_id: string;
  action: "update" | "delete";
  new_data: Record<string, unknown> | null;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface SubmitChangeRequestPayload {
  category: string;
  doc_id: string;
  action: "update" | "delete";
  reason: string;
  new_data?: Record<string, unknown>;
}

export interface ResolveDecision {
  decision: "approved" | "rejected";
}

// ── Upload ────────────────────────────────────────────────────────────────────

export interface UploadResult {
  message: string;
  action: "created" | "appended";
  category: string;
  rows_added: number;
  total_rows: number;
  uploaded_by: string;
  role: string;
}
