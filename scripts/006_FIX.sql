-- =====================================================
-- FIX: "Database error saving new user" on signup
-- 
-- Root cause: handle_new_user() runs as SECURITY DEFINER
-- but without SET search_path = public, Supabase cannot
-- find the user_profiles and roles tables.
--
-- Run this in your Supabase SQL Editor.
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  selected_role TEXT;
  selected_role_id UUID;
BEGIN
  -- Check if user specified a role in metadata
  selected_role := COALESCE(NEW.raw_user_meta_data->>'role', 'general_user');

  -- Get the role ID from the specified role
  SELECT id INTO selected_role_id
  FROM public.roles
  WHERE name = selected_role;

  -- Fallback to general_user if role not found
  IF selected_role_id IS NULL THEN
    SELECT id INTO selected_role_id
    FROM public.roles
    WHERE name = 'general_user';
  END IF;

  -- Insert user profile (with or without role_id if still NULL)
  INSERT INTO public.user_profiles (user_id, role_id, first_name, last_name, department)
  VALUES (
    NEW.id,
    selected_role_id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'department', '')
  )
  ON CONFLICT (user_id) DO NOTHING; -- prevent duplicate profile errors on retry

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public; -- ← THIS is the critical fix

-- Re-attach the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();