import { emit } from "@/lib/server/telemetry";

/** CSP violation reports (`report-uri`), logged so a too-strict policy or an injection attempt is visible. */
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length <= 10_000) {
    try {
      const body = JSON.parse(text) as { "csp-report"?: Record<string, unknown> };
      const report = body["csp-report"] ?? {};
      emit({
        level: "warn",
        kind: "csp-violation",
        directive: report["violated-directive"],
        blocked: report["blocked-uri"],
        page: report["document-uri"],
      });
    } catch {
      // Ignore malformed reports.
    }
  }
  return new Response(null, { status: 204 });
}
