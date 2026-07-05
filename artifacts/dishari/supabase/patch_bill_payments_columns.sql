-- Run this in Supabase SQL Editor to add the missing columns to bill_payments
-- Safe to run even if columns already exist

ALTER TABLE bill_payments
  ADD COLUMN IF NOT EXISTS amount      numeric          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz      NOT NULL DEFAULT now();
