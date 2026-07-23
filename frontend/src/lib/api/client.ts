import axios from "axios";

import { API_BASE_URL } from "@/lib/backend";
import { toApiError } from "@/lib/api/errors";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error);

    if (typeof window !== "undefined" && apiError.status && [401, 403].includes(apiError.status)) {
      const requestUrl = String((error as { config?: { url?: string } }).config?.url ?? "");
      const isAuthRequest = requestUrl.includes("/auth/login") || requestUrl.includes("/auth/me") || requestUrl.includes("/auth/logout");

      if (!isAuthRequest) {
        window.location.assign(apiError.status === 403 ? "/403" : "/401");
      }
    }

    return Promise.reject(apiError);
  }
);
