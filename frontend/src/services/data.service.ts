import { apiClient } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type {
  CategoriesResponse,
  CategoryOverview,
  DataOverviewResponse,
  DataDocument,
  PaginatedDataResponse,
  ChangeRequest,
  SubmitChangeRequestPayload,
  UploadResult,
} from "@/types/models";

export type { CategoriesResponse, CategoryOverview, DataOverviewResponse, DataDocument, PaginatedDataResponse };

// Re-export for backwards compat with existing imports
export type ChangeRequestItem = ChangeRequest;

export const dataService = {
  // ── Overview ──────────────────────────────────────────────────────────────
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
      const response = await apiClient.get<DataOverviewResponse>("/data/");
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  // ── Documents ─────────────────────────────────────────────────────────────
  async searchCategory(
    category: string,
    q: string,
    options: { field?: string; page?: number; pageSize?: number } = {}
  ) {
    try {
      const params = new URLSearchParams({ q });
      if (options.field) params.set("field", options.field);
      if (options.page) params.set("page", String(options.page));
      if (options.pageSize) params.set("page_size", String(options.pageSize));
      const response = await apiClient.get<PaginatedDataResponse>(
        `/data/${encodeURIComponent(category)}/search?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getCategoryFields(category: string) {
    try {
      const response = await apiClient.get<{ category: string; fields: string[] }>(
        `/data/${encodeURIComponent(category)}/fields`
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async updateDocument(category: string, docId: string, updates: Record<string, unknown>) {
    try {
      const response = await apiClient.put<{ message: string; doc_id: string; data: DataDocument }>(
        `/data/${encodeURIComponent(category)}/${encodeURIComponent(docId)}`,
        { updates }
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async deleteDocument(category: string, docId: string) {
    try {
      const response = await apiClient.delete<{ message: string; deleted_data: DataDocument }>(
        `/data/${encodeURIComponent(category)}/${encodeURIComponent(docId)}`
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async deleteCategory(category: string) {
    try {
      const response = await apiClient.delete<{
        message: string;
        category: string;
        documents_deleted: number;
        deleted_by: string;
      }>(`/data/${encodeURIComponent(category)}`);
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  /** Returns the download URL (used with window.open or an anchor) */
  getDownloadUrl(category: string) {
    return `/api/data/${encodeURIComponent(category)}/download`;
  },

  // ── Upload ────────────────────────────────────────────────────────────────
  async uploadFile(file: File, category: string, customCategory?: string) {
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      if (customCategory) form.append("custom_category", customCategory);

      const response = await apiClient.post<UploadResult>("/data/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  // ── Change requests ───────────────────────────────────────────────────────
  async getMyChangeRequests() {
    try {
      const response = await apiClient.get<ChangeRequest[]>("/data/change-requests/my");
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getAllChangeRequests(statusFilter?: string) {
    try {
      const params = statusFilter ? `?status_filter=${encodeURIComponent(statusFilter)}` : "";
      const response = await apiClient.get<ChangeRequest[]>(`/data/change-requests/all${params}`);
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async submitChangeRequest(payload: SubmitChangeRequestPayload) {
    try {
      const response = await apiClient.post<{ message: string; request_id: string }>(
        "/data/change-request",
        payload
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async resolveChangeRequest(requestId: string, decision: "approved" | "rejected") {
    try {
      const response = await apiClient.post<{ message: string; action_performed: string | null }>(
        `/data/change-requests/${encodeURIComponent(requestId)}/resolve`,
        { decision }
      );
      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
