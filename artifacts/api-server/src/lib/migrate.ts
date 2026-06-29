import { Client } from "pg";
import { logger } from "./logger";

const SCHEMA_SQL = `
-- ── Extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Helper: get current user's role ──────────────────────────
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ── Tables ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT        NOT NULL,
  phone       TEXT        UNIQUE NOT NULL,
  email       TEXT,
  room_number TEXT,
  join_date   TEXT        NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD')),
  status      TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  role        TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date        TEXT        NOT NULL,
  morning     BOOLEAN     NOT NULL DEFAULT false,
  night       BOOLEAN     NOT NULL DEFAULT false,
  UNIQUE (member_id, date)
);

CREATE TABLE IF NOT EXISTS expenses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  date        TEXT        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('grocery','vegetable','fish','meat','gas','other')),
  shop_name   TEXT,
  items       TEXT,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS advances (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  date        TEXT        NOT NULL,
  method      TEXT        NOT NULL DEFAULT 'Cash',
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eggs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date        TEXT        NOT NULL,
  count       INTEGER     NOT NULL DEFAULT 0,
  UNIQUE (member_id, date)
);

CREATE TABLE IF NOT EXISTS fines (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  date        TEXT        NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  id          INTEGER     PRIMARY KEY DEFAULT 1,
  egg_price   NUMERIC(8,2)  NOT NULL DEFAULT 12,
  cook_salary NUMERIC(10,2) NOT NULL DEFAULT 250,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO settings (id, egg_price, cook_salary)
VALUES (1, 12, 250)
ON CONFLICT (id) DO NOTHING;

-- ── Row Level Security ─────────────────────────────────────────
ALTER TABLE members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE eggs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fines        ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings     ENABLE ROW LEVEL SECURITY;

-- members
DO $$ BEGIN
  CREATE POLICY "admin manages members" ON members FOR ALL TO authenticated
    USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "member reads own record" ON members FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- meals
DO $$ BEGIN
  CREATE POLICY "authenticated read meals" ON meals FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin writes meals" ON meals FOR ALL TO authenticated
    USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- expenses
DO $$ BEGIN
  CREATE POLICY "authenticated read expenses" ON expenses FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin writes expenses" ON expenses FOR ALL TO authenticated
    USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- advances
DO $$ BEGIN
  CREATE POLICY "admin reads all advances" ON advances FOR SELECT TO authenticated
    USING (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "member reads own advances" ON advances FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM members WHERE id = advances.member_id AND user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin writes advances" ON advances FOR ALL TO authenticated
    USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- eggs
DO $$ BEGIN
  CREATE POLICY "authenticated read eggs" ON eggs FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin writes eggs" ON eggs FOR ALL TO authenticated
    USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- fines
DO $$ BEGIN
  CREATE POLICY "authenticated read fines" ON fines FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin writes fines" ON fines FOR ALL TO authenticated
    USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- announcements
DO $$ BEGIN
  CREATE POLICY "authenticated read announcements" ON announcements FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin writes announcements" ON announcements FOR ALL TO authenticated
    USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- settings
DO $$ BEGIN
  CREATE POLICY "authenticated read settings" ON settings FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin writes settings" ON settings FOR ALL TO authenticated
    USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Realtime ──────────────────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE
    members, meals, expenses, advances, eggs, fines, announcements, settings;
EXCEPTION WHEN others THEN NULL; END $$;
`;

function buildConnectionString(): string | null {
  const supabaseUrl = process.env["SUPABASE_URL"] ?? "";
  const dbPassword = process.env["SUPABASE_DB_PASSWORD"] ?? "";

  if (!supabaseUrl || !dbPassword) return null;

  // Extract project ref: https://{ref}.supabase.co → {ref}
  const ref = supabaseUrl.replace("https://", "").split(".")[0];
  // Use direct DB connection (supports DDL, no region needed)
  return `postgresql://postgres:${dbPassword}@db.${ref}.supabase.co:5432/postgres`;
}

export async function runMigrations(): Promise<{ ok: boolean; message: string }> {
  const connStr = buildConnectionString();

  if (!connStr) {
    logger.info("SUPABASE_DB_PASSWORD not set — skipping auto-migration");
    return { ok: false, message: "SUPABASE_DB_PASSWORD not set" };
  }

  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    logger.info("Running database migrations…");
    await client.query(SCHEMA_SQL);
    logger.info("Database migrations applied successfully");
    return { ok: true, message: "Migrations applied successfully" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Migration failed");
    return { ok: false, message: msg };
  } finally {
    await client.end().catch(() => null);
  }
}
