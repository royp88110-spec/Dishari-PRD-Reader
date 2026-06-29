-- ============================================================
-- Dishari Mess — Supabase Schema
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================

-- ── 1. Extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 2. Helper: get current user's role ───────────────────────
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ── 3. Tables ─────────────────────────────────────────────────

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
  egg_price   NUMERIC(8,2) NOT NULL DEFAULT 12,
  cook_salary NUMERIC(10,2) NOT NULL DEFAULT 250,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed the single settings row
INSERT INTO settings (id, egg_price, cook_salary)
VALUES (1, 12, 250)
ON CONFLICT (id) DO NOTHING;

-- ── 4. Enable Row Level Security ──────────────────────────────
ALTER TABLE members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE eggs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fines        ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings     ENABLE ROW LEVEL SECURITY;

-- ── 5. RLS Policies ──────────────────────────────────────────

-- members
CREATE POLICY "admin manages members"
  ON members FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "member reads own record"
  ON members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- meals
CREATE POLICY "authenticated read meals"
  ON meals FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin writes meals"
  ON meals FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- expenses
CREATE POLICY "authenticated read expenses"
  ON expenses FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin writes expenses"
  ON expenses FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- advances
CREATE POLICY "admin reads all advances"
  ON advances FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "member reads own advances"
  ON advances FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE id = advances.member_id AND user_id = auth.uid())
  );

CREATE POLICY "admin writes advances"
  ON advances FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- eggs
CREATE POLICY "authenticated read eggs"
  ON eggs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin writes eggs"
  ON eggs FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- fines
CREATE POLICY "authenticated read fines"
  ON fines FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin writes fines"
  ON fines FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- announcements
CREATE POLICY "authenticated read announcements"
  ON announcements FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin writes announcements"
  ON announcements FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- settings
CREATE POLICY "authenticated read settings"
  ON settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin writes settings"
  ON settings FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE TABLE IF NOT EXISTS bill_payments (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID          NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  month       TEXT          NOT NULL,          -- e.g. "2026-06"
  paid        BOOLEAN       NOT NULL DEFAULT false,
  paid_at     TIMESTAMPTZ,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   DEFAULT now(),
  updated_at  TIMESTAMPTZ   DEFAULT now(),
  UNIQUE (member_id, month)
);

ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manages bill_payments"
  ON bill_payments FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "member reads own bill_payment"
  ON bill_payments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE id = bill_payments.member_id AND user_id = auth.uid())
  );

-- ── 6. Enable Realtime ────────────────────────────────────────
-- In the Supabase dashboard → Database → Replication,
-- enable the following tables for realtime:
-- members, meals, expenses, advances, eggs, settings, fines, announcements, bill_payments
--
-- Or run:
ALTER PUBLICATION supabase_realtime ADD TABLE
  members, meals, expenses, advances, eggs,
  fines, announcements, settings, bill_payments;
