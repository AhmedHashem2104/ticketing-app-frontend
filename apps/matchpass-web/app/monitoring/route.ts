import { emit, forwardError, telemetryPayloadSchema } from "@/lib/server/telemetry";

/** Receives Core Web Vitals and client-side errors from the browser (sent with `navigator.sendBeacon`). */
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 10_000) return new Response(null, { status: 413 });
  let parsed;
  try {
    parsed = telemetryPayloadSchema.safeParse(JSON.parse(text));
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!parsed.success) return new Response(null, { status: 400 });
  const event = parsed.data;
  if (event.type === "web-vital") {
    emit({
      level: event.rating === "poor" ? "warn" : "info",
      kind: "web-vital",
      name: event.name,
      value: event.value,
      rating: event.rating,
      path: event.path,
    });
  } else {
    emit({ level: "error", kind: "client-error", message: event.message, digest: event.digest, path: event.path });
    await forwardError({ source: "browser", ...event, userAgent: request.headers.get("user-agent") });
  }
  return new Response(null, { status: 204 });
}
