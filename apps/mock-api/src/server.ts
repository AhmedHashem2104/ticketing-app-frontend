import { createApp } from "./app";

const { app, config } = createApp();

const server = app.listen(config.port, () => {
  console.log(`[mock-api] listening on http://localhost:${config.port}/api (${config.env})`);
});

function shutdown(signal: string) {
  console.log(`[mock-api] ${signal} received, closing server`);
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
