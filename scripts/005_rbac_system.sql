-- =====================================================
-- RBAC (Role-Based Access Control) System Migration
-- =====================================================

-- Roles lookup table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions lookup table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'files', 'reports', 'users', 'settings'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role-Permission mapping table (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- User profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  role_id UUID REFERENCES roles(id),
  first_name TEXT,
  last_name TEXT,
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- Enable RLS on new tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roles (all authenticated can read)
CREATE POLICY "roles_select_all" ON roles FOR SELECT TO authenticated USING (true);

-- RLS Policies for permissions (all authenticated can read)
CREATE POLICY "permissions_select_all" ON permissions FOR SELECT TO authenticated USING (true);

-- RLS Policies for role_permissions (all authenticated can read)
CREATE POLICY "role_permissions_select_all" ON role_permissions FOR SELECT TO authenticated USING (true);

-- RLS Policies for user_profiles
CREATE POLICY "user_profiles_select_all" ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_profiles_insert" ON user_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "user_profiles_update_own" ON user_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_profiles_update_supervisor" ON user_profiles FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      JOIN roles r ON up.role_id = r.id 
      WHERE up.user_id = auth.uid() AND r.name = 'supervisor'
    )
  );

-- =====================================================
-- Seed default roles
-- =====================================================
INSERT INTO roles (name, description) VALUES
  ('general_user', 'General user with limited access to files and basic operations'),
  ('supervisor', 'Supervisor with full access to all files, reports, and user management')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Seed permissions
-- =====================================================
INSERT INTO permissions (code, name, description, category) VALUES
  -- File permissions
  ('files.register', 'Register Files', 'Create and register new files in the system', 'files'),
  ('files.view_own', 'View Own Files', 'View files assigned to the user', 'files'),
  ('files.view_all', 'View All Files', 'View all files in the system', 'files'),
  ('files.edit_own', 'Edit Own Files', 'Edit files assigned to the user with limitations', 'files'),
  ('files.edit_all', 'Edit All Files', 'Edit any file in the system', 'files'),
  ('files.delete', 'Delete Files', 'Delete files from the system', 'files'),
  ('files.reassign', 'Reassign Files', 'Reassign files to different officers', 'files'),
  ('files.upload', 'Upload Documents', 'Upload documents to files', 'files'),
  ('files.tracking', 'Track Files', 'Access file tracking and movement history', 'files'),
  
  -- Report permissions
  ('reports.view_basic', 'View Basic Reports', 'Access basic reporting with restricted data', 'reports'),
  ('reports.view_full', 'View Full Reports', 'Access comprehensive reports with all data', 'reports'),
  ('reports.export', 'Export Reports', 'Export reports to CSV or other formats', 'reports'),
  
  -- User management permissions
  ('users.view', 'View Users', 'View user list and details', 'users'),
  ('users.create', 'Create Users', 'Create new user accounts', 'users'),
  ('users.edit', 'Edit Users', 'Edit user accounts and roles', 'users'),
  ('users.deactivate', 'Deactivate Users', 'Deactivate user accounts', 'users'),
  
  -- Settings permissions
  ('settings.view_own', 'View Own Settings', 'View and edit personal settings', 'settings'),
  ('settings.manage_system', 'Manage System Settings', 'Manage system-wide settings', 'settings')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- Assign permissions to roles
-- =====================================================

-- Get role IDs
DO $$
DECLARE
  general_user_role_id UUID;
  supervisor_role_id UUID;
BEGIN
  SELECT id INTO general_user_role_id FROM roles WHERE name = 'general_user';
  SELECT id INTO supervisor_role_id FROM roles WHERE name = 'supervisor';
  
  -- General User permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT general_user_role_id, id FROM permissions WHERE code IN (
    'files.register',
    'files.view_own',
    'files.edit_own',
    'files.upload',
    'files.tracking',
    'reports.view_basic',
    'settings.view_own'
  )
  ON CONFLICT DO NOTHING;
  
  -- Supervisor permissions (all permissions)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT supervisor_role_id, id FROM permissions
  ON CONFLICT DO NOTHING;
END $$;

-- =====================================================
-- Function to get user role
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  role_name TEXT;
BEGIN
  SELECT r.name INTO role_name
  FROM user_profiles up
  JOIN roles r ON up.role_id = r.id
  WHERE up.user_id = p_user_id;
  
  RETURN COALESCE(role_name, 'general_user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function to check if user has permission
-- =====================================================
CREATE OR REPLACE FUNCTION user_has_permission(p_user_id UUID, permission_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles up
    JOIN role_permissions rp ON up.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE up.user_id = p_user_id AND p.code = permission_code
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function to get all user permissions
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_code TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.code
  FROM user_profiles up
  JOIN role_permissions rp ON up.role_id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function to auto-create user profile on signup
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
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
  
  INSERT INTO user_profiles (user_id, role_id, first_name, last_name, department)
  VALUES (
    NEW.id, 
    selected_role_id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'department', '')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup (only if auth.users exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

-- =====================================================
-- Update updated_at trigger for user_profiles
-- =====================================================
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- View for user with role and permissions
-- =====================================================
CREATE OR REPLACE VIEW user_role_view AS
SELECT 
  up.id,
  up.user_id,
  up.first_name,
  up.last_name,
  up.department,
  up.is_active,
  r.name as role_name,
  r.description as role_description,
  up.created_at,
  up.updated_at
FROM user_profiles up
LEFT JOIN roles r ON up.role_id = r.id;

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
