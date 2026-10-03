import type { ApiError, ApiErrorCode } from "@repo/contracts";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

const statusByCode: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  INVALID_CODE: 400,
  UNAUTHORIZED: 401,
  PAYMENT_DECLINED: 402,
  FORBIDDEN: 403,
  FAN_ID_REQUIRED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SEAT_UNAVAILABLE: 409,
  HOLD_EXPIRED: 410,
  LIMIT_EXCEEDED: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class HttpError extends Error {
  readonly status: number;

  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "HttpError";
    this.status = statusByCode[code];
  }
}

export const notFound = (what: string) => new HttpError("NOT_FOUND", `${what} not found`);

export function zodDetails(error: ZodError) {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError("NOT_FOUND", `No route for ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  void next;
  let body: ApiError;
  let status: number;
  if (err instanceof HttpError) {
    status = err.status;
    body = { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
  } else if (err instanceof ZodError) {
    status = 400;
    body = { error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: zodDetails(err) } };
  } else if (err instanceof SyntaxError && "body" in err) {
    status = 400;
    body = { error: { code: "VALIDATION_ERROR", message: "Malformed JSON body" } };
  } else {
    status = 500;
    console.error(err);
    body = { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } };
  }
  res.status(status).json(body);
};
