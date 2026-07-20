import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { verifyAdmin } from "../middleware/verifyAdmin";

const router = Router();

// ── GET /api/admin/payments ───────────────────────────────────────────────────
// List all payment submissions, optionally filtered by month.
router.get("/admin/payments", verifyAdmin, async (req, res) => {
  const { month } = req.query as { month?: string };
  let query = supabaseAdmin
    .from("payment_submissions")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (month) query = query.eq("month", month);
  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ submissions: data ?? [] });
});

// ── POST /api/admin/payments/:id/approve ─────────────────────────────────────
// Approve a payment submission; updates bill_payments cumulative total.
// Body: { approvedAmount: number, dueAmount?: number }
router.post("/admin/payments/:id/approve", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { approvedAmount, dueAmount } = req.body as {
    approvedAmount?: number;
    dueAmount?: number;
  };

  if (approvedAmount == null || isNaN(Number(approvedAmount)) || Number(approvedAmount) <= 0) {
    res.status(400).json({ error: "Valid approved amount is required." });
    return;
  }

  const approved = Number(approvedAmount);
  const due = dueAmount != null ? Number(dueAmount) : null;
  const now = new Date().toISOString();

  // 1. Update submission
  const { data: sub, error: subErr } = await supabaseAdmin
    .from("payment_submissions")
    .update({ status: "approved", approved_amount: approved, reviewed_at: now })
    .eq("id", id)
    .select()
    .single();

  if (subErr || !sub) {
    res.status(500).json({ error: subErr?.message ?? "Submission not found." });
    return;
  }

  const row = sub as Record<string, unknown>;
  const memberId = row.member_id as string;
  const month = row.month as string;
  const year = Number((month as string).split("-")[0]);

  // 2. Fetch existing bill_payments
  const { data: existingPay } = await supabaseAdmin
    .from("bill_payments")
    .select("id, amount")
    .eq("member_id", memberId)
    .eq("month", month)
    .maybeSingle();

  const existingRow = existingPay as Record<string, unknown> | null;
  const existingAmount = existingRow ? Number(existingRow.amount ?? 0) : 0;
  const newTotal = existingAmount + approved;
  const isFullyPaid = due != null && newTotal >= due;
  const paidAt = isFullyPaid ? now : null;

  // 3. Upsert bill_payments
  if (existingRow?.id) {
    await supabaseAdmin
      .from("bill_payments")
      .update({ amount: newTotal, paid: isFullyPaid, paid_at: paidAt })
      .eq("id", existingRow.id as string);
  } else {
    await supabaseAdmin
      .from("bill_payments")
      .insert({ member_id: memberId, month, year, amount: newTotal, paid: isFullyPaid, paid_at: paidAt });
  }

  res.json({ success: true, submission: sub, totalPaid: newTotal, isFullyPaid });
});

// ── POST /api/admin/payments/:id/reject ──────────────────────────────────────
// Reject a payment submission.
// Body: { adminNotes?: string }
router.post("/admin/payments/:id/reject", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { adminNotes } = req.body as { adminNotes?: string };
  const now = new Date().toISOString();

  const { data: sub, error } = await supabaseAdmin
    .from("payment_submissions")
    .update({
      status: "rejected",
      reviewed_at: now,
      ...(adminNotes?.trim() ? { admin_notes: adminNotes.trim() } : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !sub) {
    res.status(500).json({ error: error?.message ?? "Submission not found." });
    return;
  }

  res.json({ success: true, submission: sub });
});

export default router;
