-- =====================================================
-- Add email column to user_profiles
-- =====================================================

-- Add email column to user_profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Create index on email
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  selected_role TEXT;
  selected_role_id UUID;
BEGIN
  -- Check if user specified a role in metadata
  selected_role := COALESCE(NEW.raw_user_meta_data->>'role', 'general_user');
  
  -- Get the role ID
  SELECT id INTO selected_role_id FROM roles WHERE name = selected_role;
  
  -- Fallback to general_user if role not found
  IF selected_role_id IS NULL THEN
    SELECT id INTO selected_role_id FROM roles WHERE name = 'general_user';
  END IF;
  
  INSERT INTO user_profiles (user_id, role_id, first_name, last_name, department, email)
  VALUES (
    NEW.id, 
    selected_role_id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    NEW.email
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing profiles with email from auth.users (if available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    UPDATE user_profiles up
    SET email = au.email
    FROM auth.users au
    WHERE up.user_id = au.id AND up.email IS NULL;
  END IF;
END $$;
