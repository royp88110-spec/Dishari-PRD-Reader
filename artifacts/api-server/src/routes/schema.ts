import { Router } from "express";
// esbuild bundles this as a string literal at build time (loader: { ".sql": "text" })
// This guarantees /api/schema always matches the canonical supabase/schema.sql.
// @ts-expect-error — .sql import resolved by esbuild text loader, not TypeScript
import SCHEMA_SQL from "../../../../supabase/schema.sql";

const router = Router();

router.get("/schema", (_req, res) => {
  res.type("text/plain").send(SCHEMA_SQL);
});

export default router;
export { SCHEMA_SQL };
