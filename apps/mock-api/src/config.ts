import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000,http://localhost:5173"),
  QUEUE_TIME_SCALE: z.coerce.number().positive().max(100).default(1),
  HOLD_MINUTES: z.coerce.number().int().positive().max(60).default(10),
  ENABLE_TEST_ROUTES: z.enum(["true", "false"]).optional(),
});

export type AppConfig = {
  env: "development" | "test" | "production";
  port: number;
  corsOrigins: string[];
  queueTimeScale: number;
  holdMinutes: number;
  enableTestRoutes: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid mock-api environment: ${problems}`);
  }
  const e = parsed.data;
  return {
    env: e.NODE_ENV,
    port: e.PORT,
    corsOrigins: e.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    queueTimeScale: e.QUEUE_TIME_SCALE,
    holdMinutes: e.HOLD_MINUTES,
    enableTestRoutes: e.ENABLE_TEST_ROUTES ? e.ENABLE_TEST_ROUTES === "true" : e.NODE_ENV !== "production",
  };
}
