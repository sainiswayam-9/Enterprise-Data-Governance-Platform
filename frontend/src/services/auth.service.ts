import { apiClient } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { AuthUser, LoginCredentials } from "@/types/auth";

function normalizeUser(data: Partial<AuthUser> & { user_id?: string; id?: string }): AuthUser {
  return {
    id: data.id ?? data.user_id ?? "",
    username: data.username ?? "",
    email: data.email ?? "",
    role: data.role ?? "salesperson",
    is_active: data.is_active ?? true,
    created_by: data.created_by ?? null,
  };
}

export const authService = {
  async login(credentials: LoginCredentials) {
    try {
      // POST /api/auth/login — the Next.js route sets the httpOnly cookie and returns safe user fields only
      await apiClient.post("/auth/login", credentials);
      // Fetch the canonical session immediately after the cookie is set
      const sessionResponse = await apiClient.get<AuthUser>("/auth/me");
      return { user: normalizeUser(sessionResponse.data) };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async me() {
    try {
      const response = await apiClient.get<AuthUser>("/auth/me");
      return normalizeUser(response.data);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async logout() {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      throw toApiError(error);
    }
  },

  async verifySession() {
    try {
      return await this.me();
    } catch {
      return null;
    }
  },
};
