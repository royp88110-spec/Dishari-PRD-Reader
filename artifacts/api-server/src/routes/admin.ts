import { Router } from "express";
import { supabaseAdmin, getSupabaseAdmin } from "../lib/supabaseAdmin";
import { verifyAdmin } from "../middleware/verifyAdmin";

const router = Router();

const toEmail = (identifier: string): string => {
  const id = identifier.trim().toLowerCase();
  return id.includes("@") ? id : `${id}@dishari.app`;
};

router.get("/setup/status", async (_req, res) => {
  try {
    const { count, error } = await supabaseAdmin
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (error) {
      const schemaNotReady =
        error.message.includes("schema cache") ||
        error.message.includes("does not exist") ||
        error.message.includes("relation") ||
        error.code === "42P01" ||
        error.code === "PGRST200";
      if (schemaNotReady) {
        res.status(503).json({ needsSetup: false, schemaNotReady: true, error: "Database schema not set up. Run supabase/schema.sql in your Supabase SQL Editor." });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ needsSetup: (count ?? 0) === 0 });
  } catch {
    res.status(503).json({ needsSetup: false, configured: false });
  }
});

router.post("/setup", async (req, res) => {
  try { getSupabaseAdmin(); } catch {
    res.status(503).json({ error: "Supabase is not configured on the server. Set SUPABASE_URL and SUPABASE_SERVICE_KEY." });
    return;
  }
  const { count } = await supabaseAdmin
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if ((count ?? 0) > 0) {
    res.status(409).json({ error: "Admin already exists. Setup can only run once." });
    return;
  }

  const { name, password } = req.body as { name?: string; password?: string };
  if (!name?.trim() || !password || password.length < 6) {
    res.status(400).json({ error: "Name and password (min 6 chars) are required." });
    return;
  }

  const email = toEmail("admin");

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    res.status(500).json({ error: authError?.message ?? "Failed to create admin auth user." });
    return;
  }

  const { error: memberError } = await supabaseAdmin.from("members").insert({
    user_id: authData.user.id,
    name: name.trim(),
    phone: "admin",
    role: "admin",
    status: "active",
    join_date: new Date().toISOString().slice(0, 10),
  });

  if (memberError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    res.status(500).json({ error: memberError.message });
    return;
  }

  res.status(201).json({ success: true, message: "Admin account created. You can now log in with ID: admin" });
});

router.post("/admin/members", verifyAdmin, async (req, res) => {
  const { name, phone, email, roomNumber, joinDate, status, password } =
    req.body as {
      name?: string; phone?: string; email?: string;
      roomNumber?: string; joinDate?: string;
      status?: string; password?: string;
    };

  if (!name?.trim() || !phone?.trim() || !password?.trim()) {
    res.status(400).json({ error: "Name, phone, and password are required." });
    return;
  }

  const memberEmail = toEmail(phone.trim());

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: memberEmail,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    res.status(500).json({ error: authError?.message ?? "Failed to create member auth user." });
    return;
  }

  const { data: member, error: memberError } = await supabaseAdmin.from("members").insert({
    user_id: authData.user.id,
    name: name.trim(),
    phone: phone.trim(),
    email: email?.trim() || null,
    room_number: roomNumber?.trim() || null,
    join_date: joinDate || new Date().toISOString().slice(0, 10),
    status: status || "active",
    role: "member",
  }).select().single();

  if (memberError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    res.status(500).json({ error: memberError.message });
    return;
  }

  res.status(201).json({ success: true, member });
});

router.patch("/admin/members/:id/password", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body as { password?: string };

  if (!password || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  const { data: member } = await supabaseAdmin
    .from("members")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!member?.user_id) {
    res.status(404).json({ error: "Member not found." });
    return;
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    member.user_id as string,
    { password }
  );

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ success: true });
});

router.delete("/admin/members/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;

  const { data: member } = await supabaseAdmin
    .from("members")
    .select("user_id, role")
    .eq("id", id)
    .single();

  if (!member) {
    res.status(404).json({ error: "Member not found." });
    return;
  }

  if (member.role === "admin") {
    res.status(403).json({ error: "Cannot delete the admin account." });
    return;
  }

  await supabaseAdmin.from("members").delete().eq("id", id);

  if (member.user_id) {
    await supabaseAdmin.auth.admin.deleteUser(member.user_id as string);
  }

  res.json({ success: true });
});

export default router;
