import { apiClient } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";

export interface CategoryOverviewItem {
  category: string;
  document_count: number;
  fields: string[];
}

export interface CategoriesResponse {
  predefined: string[];
  existing: string[];
  all: string[];
  note: string;
}

export interface OverviewResponse {
  categories: CategoryOverviewItem[];
  total: number;
}

export interface ChangeRequestItem {
  id: string;
  requester: string;
  category: string;
  doc_id: string;
  action: string;
  new_data: Record<string, unknown> | null;
  reason: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export const dataService = {
  async getCategories() {
    try {
      const response = await apiClient.get<CategoriesResponse>("/data/categories");
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getOverview() {
    try {
      const response = await apiClient.get<OverviewResponse>("/data/");
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getMyChangeRequests() {
    try {
      const response = await apiClient.get<ChangeRequestItem[]>("/data/change-requests/my");
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getAllChangeRequests() {
    try {
      const response = await apiClient.get<ChangeRequestItem[]>("/data/change-requests/all");
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
