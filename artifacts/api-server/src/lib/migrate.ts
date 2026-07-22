/**
 * migrate.ts — idempotent schema patch runner
 *
 * Uses Supabase's internal postgres-meta endpoint (`/pg/query`) which is
 * accessible on Supabase.io via the Kong gateway with the service-role key.
 * This lets the API server apply DDL automatically without user intervention.
 */
import { logger } from "./logger";

const supabaseUrl = () => process.env["SUPABASE_URL"] ?? "";
const serviceKey  = () => process.env["SUPABASE_SERVICE_KEY"] ?? "";

/** Run one or more SQL statements via the postgres-meta /pg/query endpoint. */
async function pgQuery(sql: string): Promise<{ ok: boolean; error?: string }> {
  const url = supabaseUrl();
  const key  = serviceKey();
  if (!url || !key) return { ok: false, error: "Supabase env vars not set" };

  try {
    const res = await fetch(`${url}/pg/query`, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${key}`,
        "Content-Type": "application/json",
        // Supabase Studio sends this; Kong may check it
        "X-Connection-Encrypted": "true",
      },
      body: JSON.stringify({ query: sql }),
    });

    if (res.ok) return { ok: true };
    const body = await res.text();
    return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 300)}` };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Idempotently add the three new columns to `announcements`.
 * Returns true  → migration applied, PostgREST schema reloaded.
 * Returns false → auto-migration not available (user must run SQL manually).
 */
export async function applyAnnouncementsMigration(): Promise<boolean> {
  // Run ALTER TABLE then reload PostgREST schema cache in one batch
  const sql = [
    `ALTER TABLE public.announcements`,
    `  ADD COLUMN IF NOT EXISTS type             text NOT NULL DEFAULT 'general',`,
    `  ADD COLUMN IF NOT EXISTS target_member_id uuid,`,
    `  ADD COLUMN IF NOT EXISTS target_month     text;`,
    `NOTIFY pgrst, 'reload schema';`,
  ].join("\n");

  const result = await pgQuery(sql);

  if (result.ok) {
    logger.info("announcements schema migration applied via pg/query");
    // Give PostgREST a moment to reload before the caller retries inserts
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    return true;
  }

  logger.warn({ pgQueryError: result.error }, "pg/query auto-migration unavailable");
  return false;
}

/** SQL the user can run manually if auto-migration fails. */
export const ANNOUNCEMENTS_MIGRATION_SQL =
  `ALTER TABLE public.announcements\n` +
  `  ADD COLUMN IF NOT EXISTS type             text NOT NULL DEFAULT 'general',\n` +
  `  ADD COLUMN IF NOT EXISTS target_member_id uuid,\n` +
  `  ADD COLUMN IF NOT EXISTS target_month     text;`;
