CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  general_user_role_id UUID;
  first TEXT;
  last  TEXT;
BEGIN
  -- Always assign general_user — never trust client metadata for role
  SELECT id INTO general_user_role_id
  FROM public.roles
  WHERE name = 'general_user';

  first := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  last  := COALESCE(NEW.raw_user_meta_data->>'last_name', '');

  -- 1. Insert into user_profiles
  INSERT INTO public.user_profiles (
    user_id, role_id, first_name, last_name, department, is_active
  )
  VALUES (
    NEW.id,
    general_user_role_id,
    first,
    last,
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    true
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 2. Insert into officers
  INSERT INTO public.officers (name, email, department)
  VALUES (
    TRIM(first || ' ' || last),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'department', NULL)
  )
  ON CONFLICT (email) DO NOTHING;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;


INSERT INTO public.officers (name, email, department)
SELECT 
  TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')),
  au.email,
  up.department
FROM public.user_profiles up
JOIN auth.users au ON au.id = up.user_id
ON CONFLICT (email) DO NOTHING;


SELECT 
  au.email,
  up.first_name || ' ' || up.last_name AS profile_name,
  o.name AS officer_name,
  r.name AS role
FROM auth.users au
JOIN public.user_profiles up ON up.user_id = au.id
JOIN public.roles r ON r.id = up.role_id
LEFT JOIN public.officers o ON o.email = au.email;