import compression from "compression";
import cors from "cors";
import express, { Router } from "express";
import helmet from "helmet";
import { loadConfig, type AppConfig } from "./config";
import { DEMO_USER, Store } from "./data/store";
import { errorHandler, notFoundHandler } from "./http/errors";
import { accountRouter } from "./routes/account";
import { catalogRouter } from "./routes/catalog";
import { checkoutRouter } from "./routes/checkout";
import { queueRouter } from "./routes/queue";
import { walletRouter } from "./routes/wallet";

export type CreateAppOptions = { config?: Partial<AppConfig>; store?: Store };

export function createApp(options: CreateAppOptions = {}) {
  const config: AppConfig = { ...loadConfig(), ...options.config };
  const store = options.store ?? new Store();
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, credentials: false }));
  app.use(compression());
  app.use(express.json({ limit: "100kb" }));

  const api = Router();
  api.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: Math.round(process.uptime()), time: store.now().toISOString() });
  });

  if (config.enableTestRoutes) {
    api.post("/__test__/reset", (_req, res) => {
      store.reset();
      res.json({ reset: true, demoUser: DEMO_USER });
    });
  }

  api.use(catalogRouter(store));
  api.use(accountRouter(store));
  api.use(queueRouter(store, config));
  api.use(checkoutRouter(store, config));
  api.use(walletRouter(store));

  app.use("/api", api);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, store, config };
}
