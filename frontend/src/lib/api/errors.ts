import axios, { AxiosError } from "axios";

export interface ApiErrorPayload {
  detail?: string;
  message?: string;
  errors?: unknown;
}

export class ApiError extends Error {
  status?: number;
  payload?: ApiErrorPayload;

  constructor(message: string, status?: number, payload?: ApiErrorPayload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorPayload>;
    const status = axiosError.response?.status;
    const payload = axiosError.response?.data;
    const message = payload?.detail ?? payload?.message ?? axiosError.message ?? "Request failed.";
    return new ApiError(message, status, payload);
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError("Request failed.");
}
