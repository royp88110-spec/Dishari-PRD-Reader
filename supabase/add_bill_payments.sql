-- ============================================================
-- Migration: Add bill_payments table
-- Run this in Supabase → SQL Editor → New query
-- ============================================================

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

-- Admin can do everything
CREATE POLICY "admin manages bill_payments"
  ON bill_payments FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Members can only read their own payment status
CREATE POLICY "member reads own bill_payment"
  ON bill_payments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE id = bill_payments.member_id AND user_id = auth.uid())
  );

-- Enable realtime for the new table
ALTER PUBLICATION supabase_realtime ADD TABLE bill_payments;
