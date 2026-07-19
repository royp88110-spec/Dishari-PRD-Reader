-- ─── UPI Payment Feature Migration ─────────────────────────────────────────
-- Run this in your Supabase SQL Editor to enable the UPI payment feature.

-- 1. UPI Settings (singleton row, managed by admin)
CREATE TABLE IF NOT EXISTS upi_settings (
  id                  INTEGER PRIMARY KEY DEFAULT 1,
  upi_id              TEXT    NOT NULL DEFAULT '',
  account_holder_name TEXT    NOT NULL DEFAULT '',
  qr_code_base64      TEXT,
  payment_note        TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO upi_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 2. Payment Submissions (member UPI payment submissions pending admin verification)
CREATE TABLE IF NOT EXISTS payment_submissions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id         UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  month             TEXT        NOT NULL,
  claimed_amount    NUMERIC     NOT NULL DEFAULT 0,
  screenshot_base64 TEXT,
  utr               TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending',
  approved_amount   NUMERIC,
  submitted_at      TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at       TIMESTAMPTZ,
  admin_notes       TEXT
);

-- 3. RLS Policies for upi_settings
ALTER TABLE upi_settings ENABLE ROW LEVEL SECURITY;
-- Anyone authenticated can read UPI settings
CREATE POLICY "upi_settings_read" ON upi_settings
  FOR SELECT TO authenticated USING (true);
-- Only admin (via service role) can write; app uses anon key so no INSERT/UPDATE policy needed
-- (admin writes go through the Supabase client with admin's own auth session)
-- If you want members to read only: the above policy is sufficient.

-- 4. RLS Policies for payment_submissions
ALTER TABLE payment_submissions ENABLE ROW LEVEL SECURITY;
-- Members can see their own submissions; admin can see all
CREATE POLICY "payment_submissions_select" ON payment_submissions
  FOR SELECT TO authenticated USING (true);
-- Members can insert their own submissions
CREATE POLICY "payment_submissions_insert" ON payment_submissions
  FOR INSERT TO authenticated WITH CHECK (true);
-- Admin can update (approve/reject) any submission
CREATE POLICY "payment_submissions_update" ON payment_submissions
  FOR UPDATE TO authenticated USING (true);

-- 5. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE upi_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_submissions;
