-- ============================================================
-- Migration: per-member announcement read tracking
-- Run in Supabase SQL Editor (idempotent — safe to re-run)
-- ============================================================

CREATE TABLE IF NOT EXISTS announcement_reads (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  announcement_id UUID        NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE (member_id, announcement_id)
);

ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Members can insert and read their own records
CREATE POLICY "member manages own announcement reads"
  ON announcement_reads FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE id = announcement_reads.member_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE id = announcement_reads.member_id AND user_id = auth.uid())
  );

-- Admin can see all reads (for analytics / auditing)
CREATE POLICY "admin reads all announcement reads"
  ON announcement_reads FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');
