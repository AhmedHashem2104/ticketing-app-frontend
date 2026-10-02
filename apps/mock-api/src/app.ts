import { randomUUID } from "node:crypto";
import compression from "compression";
import cors from "cors";
import express, { Router, type RequestHandler } from "express";
import helmet from "helmet";
import { loadConfig, type AppConfig } from "./config";
import { DEMO_USER, SECOND_USER, Store } from "./data/store";
import { errorHandler, notFoundHandler } from "./http/errors";
import { localizeResponses } from "./i18n/localize";
import { accountRouter } from "./routes/account";
import { catalogRouter, catalogTestRoutes } from "./routes/catalog";
import { checkoutRouter, paymentTestRoutes } from "./routes/checkout";
import { queueRouter } from "./routes/queue";
import { staffRouter } from "./routes/staff";
import { gateRouter, walletRouter } from "./routes/wallet";

export type CreateAppOptions = { config?: Partial<AppConfig>; store?: Store };

/** Every response carries a request id (honouring the caller's) so logs can be correlated across the BFF and API. */
const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get("x-request-id");
  const id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  res.locals.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
};

/** One structured JSON line per request — what a log pipeline (Loki, CloudWatch, Datadog) ingests. */
const accessLog: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(
      JSON.stringify({
        level: res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
        msg: "request",
        method: req.method,
        // Never log query strings or bodies: they can carry codes and personal data.
        path: req.path,
        status: res.statusCode,
        ms: Math.round(ms * 10) / 10,
        requestId: res.locals.requestId,
      }),
    );
  });
  next();
};

export function createApp(options: CreateAppOptions = {}) {
  const config: AppConfig = { ...loadConfig(), ...options.config };
  const store = options.store ?? new Store(undefined, { qrSecret: config.qrSecret });
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(requestId);
  if (config.env !== "test") app.use(accessLog);
  app.use(
    helmet({
      contentSecurityPolicy: {
        // The hosted payment page posts back to itself and uses an inline <style> block.
        directives: { "form-action": ["'self'"], "style-src": ["'self'", "'unsafe-inline'"] },
      },
    }),
  );
  app.use(cors({ origin: config.corsOrigins, credentials: false, exposedHeaders: ["X-Request-Id", "Retry-After"] }));
  app.use(compression());
  app.use(express.json({ limit: "100kb" }));
  app.use(localizeResponses);

  const api = Router();
  api.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: Math.round(process.uptime()), time: store.now().toISOString() });
  });
  /** Readiness: the store is seeded and answering (a real service would check its database here). */
  api.get("/ready", (_req, res) => {
    const ready = store.events.length > 0;
    res.status(ready ? 200 : 503).json({ ready });
  });

  if (config.enableTestRoutes) {
    api.post("/__test__/reset", (_req, res) => {
      store.reset();
      res.json({ reset: true, demoUser: DEMO_USER, secondUser: SECOND_USER });
    });
    api.use(paymentTestRoutes(store));
    api.use(catalogTestRoutes(store));
  }

  api.use(catalogRouter(store));
  api.use(accountRouter(store, config));
  api.use(queueRouter(store, config));
  api.use(checkoutRouter(store, config));
  api.use(walletRouter(store));
  api.use(gateRouter(store));
  api.use(staffRouter(store, { enableTestRoutes: config.enableTestRoutes }));

  app.use("/api", api);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, store, config };
}
