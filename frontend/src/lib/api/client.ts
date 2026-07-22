"use client";

import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  config.withCredentials = true;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status as number | undefined;
    const requestUrl = String(error.config?.url ?? "");
    const isAuthRequest = requestUrl.includes("/auth/login") || requestUrl.includes("/auth/me");

    if (typeof window !== "undefined" && !isAuthRequest && (status === 401 || status === 403)) {
      window.location.assign(status === 403 ? "/403" : "/401");
    }

    return Promise.reject(error);
  }
);
