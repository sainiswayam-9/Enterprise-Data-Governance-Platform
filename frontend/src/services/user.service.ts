import { apiClient } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { AuthUser, AppRole } from "@/types/auth";

export interface PermissionSet {
  roles: AppRole[];
  permissions: string[];
}

export const userService = {
  async list() {
    try {
      const response = await apiClient.get<AuthUser[]>("/users/");
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getById(userId: string) {
    try {
      const response = await apiClient.get<AuthUser>(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async toggleActive(userId: string) {
    try {
      const response = await apiClient.patch<{ id: string; is_active: boolean }>(`/users/${userId}/toggle-active`);
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
