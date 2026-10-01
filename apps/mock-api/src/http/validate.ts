import type { Request } from "express";
import type { z } from "zod";
import { HttpError, zodDetails } from "./errors";

function parse<T extends z.ZodType>(schema: T, value: unknown, where: string): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new HttpError("VALIDATION_ERROR", `Invalid ${where}`, zodDetails(result.error));
  }
  return result.data;
}

export const parseBody = <T extends z.ZodType>(schema: T, req: Request) => parse(schema, req.body ?? {}, "request body");
export const parseQuery = <T extends z.ZodType>(schema: T, req: Request) => parse(schema, req.query, "query string");

/** Express 5 types params as `string | string[]`; route params here are always single strings. */
export const param = (req: Request, name: string) => {
  const value = req.params[name];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
};
