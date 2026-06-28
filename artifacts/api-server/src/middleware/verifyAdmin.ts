import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export async function verifyAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

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

  if (!member || member.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  (req as Request & { adminUserId: string }).adminUserId = user.id;
  next();
}
