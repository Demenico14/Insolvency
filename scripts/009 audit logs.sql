-- =====================================================
-- 009_audit_logs.sql
-- Immutable audit trail for all significant actions
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  performed_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name   TEXT,                          -- denormalised name at time of action
  action       TEXT        NOT NULL,          -- e.g. 'file.status_changed'
  entity_type  TEXT        NOT NULL,          -- 'file' | 'user' | 'movement'
  entity_id    TEXT,                          -- UUID of the affected record
  entity_label TEXT,                          -- human label e.g. file reference
  old_value    TEXT,                          -- before (plain text or JSON snippet)
  new_value    TEXT,                          -- after
  metadata     JSONB       DEFAULT '{}',      -- extra context
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs are append-only — no UPDATE or DELETE for authenticated users
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor      ON public.audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity     ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created    ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Supervisors can read all logs; nobody can update or delete
CREATE POLICY "audit_logs_select_supervisor"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.user_id = auth.uid() AND r.name = 'supervisor'
    )
  );

-- INSERT allowed from authenticated (server actions run as authenticated user)
CREATE POLICY "audit_logs_insert"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Explicitly block UPDATE and DELETE for everyone
CREATE POLICY "audit_logs_no_update"
  ON public.audit_logs FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "audit_logs_no_delete"
  ON public.audit_logs FOR DELETE
  TO authenticated
  USING (false);