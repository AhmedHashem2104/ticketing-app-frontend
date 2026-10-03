import type { Instrumentation } from "next";

/** Server start-up hook: logs which API the app talks to (helps debug misconfigured deploys). */
export async function register() {
  const { emit } = await import("@/lib/server/telemetry");
  emit({ level: "info", kind: "startup", apiOrigin: process.env.API_ORIGIN ?? "http://localhost:4000", runtime: process.env.NEXT_RUNTIME });
}

/** Every server-side error (rendering, route handlers, proxy) becomes a structured log line and an optional report. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { emit, forwardError } = await import("@/lib/server/telemetry");
  const message = error instanceof Error ? error.message : String(error);
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;
  const requestId = request.headers["x-request-id"];
  const entry = {
    message,
    digest,
    method: request.method,
    // Paths only — query strings can hold personal data.
    path: request.path.split("?")[0],
    routePath: context.routePath,
    routeType: context.routeType,
    requestId: Array.isArray(requestId) ? requestId[0] : requestId,
  };
  emit({ level: "error", kind: "server-error", ...entry });
  await forwardError({ source: "server", ...entry, stack: error instanceof Error ? error.stack : undefined });
};
