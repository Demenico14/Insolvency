-- =====================================================
-- 006_secure_role_assignment.sql
--
-- Goals:
--   1. Add created_by to user_profiles (tracks who created a supervisor)
--   2. Tighten RLS so only supervisors can set role to supervisor
--   3. Fix handle_new_user trigger to always assign general_user
--      (ignores role from metadata — prevents client tampering)
--   4. Add an admin-only API function to promote a user
-- =====================================================

-- ── 1. Add created_by column ─────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_created_by ON public.user_profiles(created_by);

-- ── 2. Harden handle_new_user — ALWAYS assigns general_user ──────────────────
--    The trigger no longer reads role from raw_user_meta_data so a crafted
--    signUp() call with { data: { role: 'supervisor' } } has zero effect.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  general_user_role_id UUID;
BEGIN
  -- Always resolve general_user — never trust client metadata for role
  SELECT id INTO general_user_role_id
  FROM public.roles
  WHERE name = 'general_user';

  INSERT INTO public.user_profiles (
    user_id, role_id, first_name, last_name, department, is_active
  )
  VALUES (
    NEW.id,
    general_user_role_id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    true
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── 3. Tighten user_profiles RLS ─────────────────────────────────────────────

-- Drop old permissive policies
DROP POLICY IF EXISTS "user_profiles_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_supervisor" ON public.user_profiles;

-- INSERT: only the service role (server-side) or the trigger can insert.
-- Authenticated users cannot insert directly — they go through the trigger.
CREATE POLICY "user_profiles_insert_service_only"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (false);  -- blocked for all authenticated clients; trigger runs as SECURITY DEFINER

-- UPDATE own profile (non-role fields only — role_id is locked via function below)
CREATE POLICY "user_profiles_update_own_non_role"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- Prevent self-promotion: new role_id must equal current role_id
    AND role_id = (SELECT role_id FROM public.user_profiles WHERE user_id = auth.uid())
  );

-- UPDATE any profile (supervisors only) — allows role changes
CREATE POLICY "user_profiles_update_supervisor_only"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.user_id = auth.uid()
        AND r.name = 'supervisor'
        AND up.is_active = true
    )
  );

-- ── 4. Server-side promote_to_supervisor function ─────────────────────────────
--    Called from the Next.js admin API using the service-role key.
--    Checks that the calling user is an active supervisor before promoting.
CREATE OR REPLACE FUNCTION public.promote_to_supervisor(
  target_user_id UUID,
  acting_user_id  UUID
)
RETURNS JSONB AS $$
DECLARE
  acting_role    TEXT;
  supervisor_rid UUID;
BEGIN
  -- Verify the acting user is an active supervisor
  SELECT r.name INTO acting_role
  FROM public.user_profiles up
  JOIN public.roles r ON up.role_id = r.id
  WHERE up.user_id = acting_user_id
    AND up.is_active = true;

  IF acting_role IS DISTINCT FROM 'supervisor' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Prevent self-promotion (redundant but explicit)
  IF target_user_id = acting_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot change your own role');
  END IF;

  SELECT id INTO supervisor_rid FROM public.roles WHERE name = 'supervisor';

  UPDATE public.user_profiles
  SET role_id    = supervisor_rid,
      updated_at = NOW()
  WHERE user_id = target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- ── 5. Seed check — ensure roles exist ───────────────────────────────────────
INSERT INTO public.roles (name, description) VALUES
  ('general_user', 'Standard user — assigned automatically on public signup'),
  ('supervisor',   'Full access — assigned only by existing supervisors')
ON CONFLICT (name) DO NOTHING;