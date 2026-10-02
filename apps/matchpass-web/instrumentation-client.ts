/**
 * Browser-side monitoring: uncaught errors and Core Web Vitals go to `/monitoring`, which logs them
 * on the server. Wrapped in try/catch so monitoring can never break the page.
 */
function send(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify({ ...payload, path: window.location.pathname });
    if (!navigator.sendBeacon?.("/monitoring", new Blob([body], { type: "application/json" }))) {
      void fetch("/monitoring", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
    }
  } catch {
    // Ignore — monitoring is best effort.
  }
}

try {
  window.addEventListener("error", (event) => {
    send({
      type: "client-error",
      message: String(event.message).slice(0, 1_000),
      stack: event.error instanceof Error ? event.error.stack?.slice(0, 4_000) : undefined,
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    send({
      type: "client-error",
      message: (reason instanceof Error ? reason.message : String(reason)).slice(0, 1_000),
      stack: reason instanceof Error ? reason.stack?.slice(0, 4_000) : undefined,
    });
  });
} catch {
  // Ignore.
}

export { send as reportTelemetry };
