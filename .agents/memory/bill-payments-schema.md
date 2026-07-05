---
name: bill_payments schema quirks
description: Actual Supabase bill_payments table schema differs from code assumptions; documents required columns and workarounds.
---

## Rule
Always include `year` (integer, NOT NULL) in `bill_payments` INSERT calls. Extract from the "YYYY-MM" month string: `Number(month.split("-")[0])`.

**Why:** The user's Supabase table has a separate `year` column with NOT NULL constraint. The code's `month` field stores "YYYY-MM" format but the DB also requires `year` separately.

**How to apply:** Use `buildPaymentRow(memberId, month, extra)` helper in DataContext — it automatically adds `year`. UPDATE calls (by row ID) do not need `year` since the column is already set on the existing row.

## Known missing columns (user ran partial migration)
The user's bill_payments table was created without `amount` and `updated_at`. Code now defaults `amount` to 0 on read and does not write `amount`/`updated_at` on insert/update.

## No UNIQUE constraint on (member_id, month)
The table has no UNIQUE constraint, so `upsert` with `onConflict` fails. Code uses select-then-insert-or-update pattern instead, using the in-memory row ID when available to skip the SELECT.

## SQL patch file
`artifacts/dishari/supabase/patch_bill_payments_columns.sql` — adds missing columns and the UNIQUE constraint (safe to run, uses IF NOT EXISTS).
