import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "./lib/migrate";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Run DB migrations automatically (requires SUPABASE_DB_PASSWORD)
  runMigrations().then(({ ok, message }) => {
    if (ok) {
      logger.info("Auto-migration complete");
    } else {
      logger.warn({ message }, "Auto-migration skipped or failed");
    }
  }).catch((err: unknown) => {
    logger.error({ err }, "Unexpected error during migration");
  });
});
