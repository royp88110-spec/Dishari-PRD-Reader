---
name: Fine Management RLS and Notes Clearing
description: Correct RLS pattern for per-member data and notes-clearing pattern in updateFine
---

## RLS for per-member data tables (fines, advances)

Do NOT use `USING (true)` for member-readable tables — this exposes all members' data to all authenticated users. Use two separate policies:

```sql
-- Admin sees all
DO $$ BEGIN CREATE POLICY "admin reads all fines" ON fines FOR SELECT TO authenticated
  USING (get_my_role()='admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Member sees only own rows
DO $$ BEGIN CREATE POLICY "member reads own fines" ON fines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM members WHERE id=fines.member_id AND user_id=auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

**Why:** Broad `USING (true)` leaks private per-member data (bill amounts, fines) across all authenticated users. RLS is the only enforcement layer since the client does `select("*")`.

**How to apply:** Any new table with `member_id` that members should see only their own rows — always use the two-policy pattern above. Egg entries and expenses are shared-read (shared costs visible to all) so `USING (true)` is correct there.

## Notes clearing in partial updates

When a field is nullable and can be cleared (set to null/empty), the update function must use `"field" in u` rather than `u.field !== undefined`:

```ts
// WRONG — cannot clear notes; empty string treated as "no change"
if (u.notes !== undefined) row.notes = u.notes;

// CORRECT — allows clearing by passing "" or undefined explicitly
if ("notes" in u) row.notes = (u.notes && u.notes.trim()) ? u.notes.trim() : null;
```

And the caller (modal save) must always include the field in the update payload when editing:

```ts
...(editingRecord
  ? { notes: form.notes }          // always include when editing (even empty string)
  : form.notes.trim()
    ? { notes: form.notes.trim() } // only include when adding if non-empty
    : {}),
```

**Why:** Omitting a key entirely (`undefined`) means the update function skips it. To clear an existing DB value, the key must be present in the payload with a falsy value.
