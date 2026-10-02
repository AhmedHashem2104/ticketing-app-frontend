import { apiErrorSchema, type ApiErrorCode } from "@repo/contracts";
import { msg, negotiateLocale } from "@repo/i18n";
import axios, { AxiosError } from "axios";
import { z } from "zod";

/** Error thrown for any failed API call, normalised from the API's `{ error: { code, message } }` body. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | "NETWORK_ERROR" | "CONTRACT_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function toApiError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) return error;
  if (error instanceof AxiosError) {
    const parsed = apiErrorSchema.safeParse(error.response?.data);
    if (parsed.success)
      return new ApiRequestError(error.response?.status ?? 500, parsed.data.error.code as ApiErrorCode, parsed.data.error.message);
    if (!error.response)
      return new ApiRequestError(0, "NETWORK_ERROR", msg("We can't reach Matchpass right now. Check your connection and try again."));
    return new ApiRequestError(error.response.status, "INTERNAL_ERROR", msg("Something went wrong. Please try again."));
  }
  if (error instanceof z.ZodError)
    return new ApiRequestError(500, "CONTRACT_ERROR", msg("We received an unexpected response. Please try again."));
  return new ApiRequestError(
    500,
    "INTERNAL_ERROR",
    error instanceof Error ? error.message : msg("Something went wrong. Please try again."),
  );
}

export const errorMessage = (error: unknown) => (error ? toApiError(error).message : undefined);

let onUnauthorized: () => void = () => {};

/** Lets the auth layer react when the staff session ends mid-visit (expired, signed out elsewhere). */
export function configureAuth(handlers: { onUnauthorized: () => void }) {
  onUnauthorized = handlers.onUnauthorized;
}

export const api = axios.create({ baseURL: "/api", timeout: 15_000, withCredentials: true, headers: { Accept: "application/json" } });

// Dashboard data (event names, labels, API messages) comes back in the page's language.
api.interceptors.request.use((config) => {
  if (typeof document !== "undefined") config.headers.set("Accept-Language", negotiateLocale(document.documentElement.lang));
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error);
    const url = (error as AxiosError).config?.url;
    if (apiError.status === 401 && url !== "/staff/me" && url !== "/staff/auth/login") onUnauthorized();
    return Promise.reject(apiError);
  },
);
