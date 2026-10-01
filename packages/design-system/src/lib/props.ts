import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Runtime prop validation.
 *
 * Every design-system component declares a zod schema for its props and calls
 * `validateProps` on render. Invalid props throw a `PropValidationError` in
 * development and tests so mistakes surface immediately; production builds skip
 * the check entirely for speed.
 */
export class PropValidationError extends Error {
  readonly component: string;
  readonly issues: { path: string; message: string }[];

  constructor(component: string, error: z.ZodError) {
    const issues = error.issues.map((issue) => ({ path: issue.path.join(".") || "(root)", message: issue.message }));
    super(`<${component}> received invalid props: ${issues.map((i) => `${i.path} — ${i.message}`).join("; ")}`);
    this.name = "PropValidationError";
    this.component = component;
    this.issues = issues;
  }
}

const isProduction = typeof process !== "undefined" && process.env?.NODE_ENV === "production";

export function validateProps<S extends z.ZodType>(component: string, schema: S, props: unknown): void {
  if (isProduction) return;
  const result = schema.safeParse(props);
  if (!result.success) throw new PropValidationError(component, result.error);
}

/* ---------- Schema helpers for React-specific prop types ---------- */

/** Any renderable React node. */
export const zNode = z.custom<ReactNode>(() => true);

/** A function prop (callback / render prop). */
export const zFn = <T extends (...args: never[]) => unknown = (...args: never[]) => unknown>() =>
  z.custom<T>((value) => typeof value === "function", { error: "Expected a function" });

/** Optional class name passthrough. */
export const zClassName = z.string().optional();

/** Non-empty, trimmed text that must be visible to users (labels, headings). */
export const zText = z.string().trim().min(1, { error: "Must not be empty" });

/** A route or URL that can be passed to the configured link component. */
export const zHref = z
  .string()
  .min(1)
  .refine((value) => value.startsWith("/") || value.startsWith("#") || /^https?:\/\//.test(value), {
    error: "Must be an absolute path, hash or http(s) URL",
  });

/** A date/time string parseable by `Date`. */
export const zDateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), { error: "Expected a valid date string" });

/** Hex colour like `#0E4D2F`. */
export const zColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, { error: "Expected a #RRGGBB colour" });
