/**
 * announcements.ts
 *
 * POST /api/admin/announcements/reminders
 *   Inserts personalised payment-reminder rows for every debtor supplied by
 *   the mobile app. Uses the service-role client (bypasses RLS).
 *
 *   If the announcements table is missing the new columns (migration not yet
 *   run), the endpoint tries to apply the migration automatically via the
 *   postgres-meta endpoint, then retries the insert once.
 *
 *   If auto-migration is unavailable the response includes `needsMigration:
 *   true` and the SQL the admin can run manually.
 */
import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { verifyAdmin } from "../middleware/verifyAdmin";
import { applyAnnouncementsMigration, ANNOUNCEMENTS_MIGRATION_SQL } from "../lib/migrate";
import { logger } from "../lib/logger";

const router = Router();

interface Debtor {
  memberId:   string;
  memberName: string;
  dueAmount:  number;
}

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function monthLabel(month: string): string {
  const [year, mo] = month.split("-");
  return `${MONTH_NAMES[parseInt(mo, 10) - 1]} ${year}`;
}

/** True when the PostgREST error indicates a missing column / schema. */
function isSchemaMissing(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  return (
    err.message?.includes("target_member_id") === true ||
    err.message?.includes("target_month")     === true ||
    err.message?.includes("type")             === true ||
    err.message?.includes("schema cache")     === true ||
    err.code === "PGRST205"
  );
}

function buildRows(debtors: Debtor[], month: string) {
  const label = monthLabel(month);
  return debtors.map((b) => ({
    title:            "🔔 Payment Reminder",
    body:
      `Hello ${b.memberName},\n\n` +
      `Your payment for ${label} is still pending.\n\n` +
      `Outstanding Amount: ₹${Math.round(b.dueAmount)}\n\n` +
      `Please complete your payment as soon as possible.`,
    type:             "payment_reminder",
    target_member_id: b.memberId,
    target_month:     month,
  }));
}

router.post("/admin/announcements/reminders", verifyAdmin, async (req, res) => {
  const { month, debtors } = req.body as {
    month?:   string;
    debtors?: Debtor[];
  };

  // ── Validate input ─────────────────────────────────────────────────────────
  if (!month || typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month must be a YYYY-MM string" });
    return;
  }
  if (!Array.isArray(debtors) || debtors.length === 0) {
    res.status(400).json({ error: "debtors must be a non-empty array" });
    return;
  }

  const rows = buildRows(debtors, month);

  // ── First insert attempt ───────────────────────────────────────────────────
  let { error: insertError } = await supabaseAdmin
    .from("announcements")
    .insert(rows);

  // ── Auto-migrate if columns are missing, then retry ────────────────────────
  if (isSchemaMissing(insertError)) {
    logger.warn(
      { supabaseError: insertError?.message },
      "Announcements schema out of date — attempting auto-migration",
    );

    const migrated = await applyAnnouncementsMigration();

    if (!migrated) {
      // Auto-migration failed — surface the SQL so admin can run it manually
      res.status(503).json({
        error:
          "The database schema needs to be updated before sending reminders. " +
          "Please run the migration SQL shown below in your Supabase SQL Editor, " +
          "then try again.",
        needsMigration: true,
        migrationSql:   ANNOUNCEMENTS_MIGRATION_SQL,
      });
      return;
    }

    // Retry after successful migration
    const retry = await supabaseAdmin.from("announcements").insert(rows);
    insertError = retry.error;
  }

  if (insertError) {
    logger.error({ supabaseError: insertError }, "Failed to insert reminder rows");
    res.status(500).json({ error: insertError.message });
    return;
  }

  res.json({ sent: debtors.length, month, label: monthLabel(month) });
});

export default router;
