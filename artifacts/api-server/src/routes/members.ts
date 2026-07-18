import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { verifyAuth, type AuthRequest } from "../middleware/verifyAuth";
import type { Request } from "express";

const router = Router();

/**
 * PATCH /api/members/me/password
 * Any authenticated member or admin can change their own password.
 */
router.patch("/members/me/password", verifyAuth, async (req: Request, res) => {
  const { password } = req.body as { password?: string };

  if (!password || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  const authReq = req as AuthRequest;

  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    authReq.authUserId,
    { password },
  );

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ success: true, message: "Password updated successfully." });
});

export default router;
