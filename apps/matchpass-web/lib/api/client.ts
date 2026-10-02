import { apiErrorSchema, type ApiErrorCode } from "@repo/contracts";
import axios, { AxiosError, type AxiosInstance } from "axios";
import { z } from "zod";

/** Error thrown for any failed API call, normalised from the API's `{ error: { code, message, details } }` body. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | "NETWORK_ERROR" | "CONTRACT_ERROR",
    message: string,
    readonly details: { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = "ApiRequestError";
  }

  /** Field-level errors keyed by their last path segment, for mapping onto form fields. */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries(this.details.map((d) => [d.path.split(".").pop() ?? d.path, d.message]));
  }
}

export function toApiError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) return error;
  if (error instanceof AxiosError) {
    const parsed = apiErrorSchema.safeParse(error.response?.data);
    if (parsed.success) {
      const { code, message, details } = parsed.data.error;
      return new ApiRequestError(error.response?.status ?? 500, code as ApiErrorCode, message, details);
    }
    if (!error.response)
      return new ApiRequestError(0, "NETWORK_ERROR", "We can't reach Matchpass right now. Check your connection and try again.");
    return new ApiRequestError(error.response.status, "INTERNAL_ERROR", "Something went wrong. Please try again.");
  }
  if (error instanceof z.ZodError) {
    return new ApiRequestError(500, "CONTRACT_ERROR", "We received an unexpected response. Please try again.");
  }
  return new ApiRequestError(500, "INTERNAL_ERROR", error instanceof Error ? error.message : "Something went wrong.");
}

export const errorMessage = (error: unknown) => (error ? toApiError(error).message : undefined);

let onUnauthorized: () => void = () => {};

/**
 * Lets the auth layer react when the session expires mid-visit. The session itself is an
 * httpOnly cookie managed by the BFF, so the browser client never handles tokens.
 */
export function configureAuth(handlers: { onUnauthorized: () => void }) {
  onUnauthorized = handlers.onUnauthorized;
}

export function createApiClient(baseURL = "/api"): AxiosInstance {
  const instance = axios.create({ baseURL, timeout: 15_000, withCredentials: true, headers: { Accept: "application/json" } });
  instance.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      const apiError = toApiError(error);
      const isSessionProbe = (error as AxiosError).config?.url === "/me";
      if (apiError.status === 401 && !isSessionProbe) onUnauthorized();
      return Promise.reject(apiError);
    },
  );
  return instance;
}

export const api = createApiClient();
