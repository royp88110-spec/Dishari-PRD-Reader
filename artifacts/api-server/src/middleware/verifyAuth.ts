import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export interface AuthRequest extends Request {
  authUserId: string;
  authMemberId: string;
  authRole: string;
}

/**
 * Verifies any authenticated user (admin or member).
 * Attaches authUserId, authMemberId, and authRole to the request.
 */
export async function verifyAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Missing authorization token" });
    return;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const { data: member } = await supabaseAdmin
    .from("members")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!member) {
    res.status(403).json({ error: "No member profile found for this account" });
    return;
  }

  const r = req as AuthRequest;
  r.authUserId = user.id;
  r.authMemberId = member.id as string;
  r.authRole = member.role as string;
  next();
}
