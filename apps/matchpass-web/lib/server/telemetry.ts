import { z } from "zod";

/**
 * Structured telemetry: one JSON line per event on stdout, the format log pipelines (Loki,
 * CloudWatch, Datadog) ingest. Set ERROR_REPORTING_URL to also forward errors to a collector
 * such as a Sentry-compatible relay.
 */
export type TelemetryEvent = { level: "info" | "warn" | "error"; kind: string; [key: string]: unknown };

export function emit(event: TelemetryEvent) {
  const line = JSON.stringify({ time: new Date().toISOString(), service: "matchpass-web", ...event });
  if (event.level === "error") console.error(line);
  else console.log(line);
}

export async function forwardError(payload: Record<string, unknown>) {
  const url = process.env.ERROR_REPORTING_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(2_000),
    });
  } catch {
    // Reporting must never take the app down.
  }
}

export const webVitalSchema = z.object({
  type: z.literal("web-vital"),
  name: z.enum(["CLS", "FCP", "INP", "LCP", "TTFB", "FID"]),
  value: z.number().finite(),
  rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
  id: z.string().max(100),
  path: z.string().max(300),
});

export const clientErrorSchema = z.object({
  type: z.literal("client-error"),
  message: z.string().max(1_000),
  stack: z.string().max(4_000).optional(),
  digest: z.string().max(100).optional(),
  path: z.string().max(300),
});

export const telemetryPayloadSchema = z.discriminatedUnion("type", [webVitalSchema, clientErrorSchema]);
