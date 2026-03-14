-- =====================================================
-- 010_sync_role_to_jwt.sql
--
-- Keeps app_metadata.role and app_metadata.is_active
-- in sync with user_profiles so middleware never needs
-- to query the database — it reads straight from the JWT.
-- =====================================================

-- ── Function: sync profile → app_metadata ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_user_role_to_jwt()
RETURNS TRIGGER AS $$
DECLARE
  role_name TEXT;
BEGIN
  -- Resolve the role name from the role_id
  SELECT name INTO role_name
  FROM public.roles
  WHERE id = NEW.role_id;

  -- Default to general_user if not found
  role_name := COALESCE(role_name, 'general_user');

  -- Write role + is_active into auth.users.raw_app_meta_data
  -- JSONB || merges keys so other app_metadata is preserved
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
    'role',      role_name,
    'is_active', NEW.is_active
  )
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- ── Trigger: fires on INSERT or UPDATE of user_profiles ──────────────────────
DROP TRIGGER IF EXISTS on_user_profile_changed ON public.user_profiles;
CREATE TRIGGER on_user_profile_changed
  AFTER INSERT OR UPDATE OF role_id, is_active
  ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_role_to_jwt();

-- ── Backfill: sync all existing profiles right now ───────────────────────────
DO $$
DECLARE
  rec RECORD;
  role_name TEXT;
BEGIN
  FOR rec IN
    SELECT up.user_id, up.role_id, up.is_active
    FROM public.user_profiles up
  LOOP
    SELECT name INTO role_name FROM public.roles WHERE id = rec.role_id;
    role_name := COALESCE(role_name, 'general_user');

    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'role',      role_name,
      'is_active', rec.is_active
    )
    WHERE id = rec.user_id;
  END LOOP;
END $$;