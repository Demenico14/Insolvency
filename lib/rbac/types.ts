// Role-Based Access Control Types

export type RoleName = 'general_user' | 'supervisor'

export interface Role {
  id: string
  name: RoleName
  description: string
  created_at: string
}

export interface Permission {
  id: string
  name: string
  description: string
  resource: string
  action: string
  created_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  role_id: string
  first_name: string | null
  last_name: string | null
  department: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  role?: Role
}

export interface UserWithRole {
  id: string
  email: string
  profile: UserProfile | null
  role: RoleName
  permissions: string[]
}

// Permission action types
export type PermissionAction = 
  | 'create'
  | 'read'
  | 'read_own'
  | 'read_all'
  | 'update'
  | 'update_own'
  | 'update_all'
  | 'delete'
  | 'reassign'
  | 'manage'
  | 'export'

// Resource types
export type Resource = 
  | 'files'
  | 'documents'
  | 'reports'
  | 'users'
  | 'settings'

// Permission string format: resource:action
export type PermissionString = `${Resource}:${PermissionAction}` | string

// Defined permissions for each role
export const ROLE_PERMISSIONS: Record<RoleName, PermissionString[]> = {
  general_user: [
    'files:create',
    'files:read_own',
    'files:update_own',
    'documents:create',
    'documents:read_own',
    'documents:update_own',
    'reports:read_own',
  ],
  supervisor: [
    'files:create',
    'files:read_all',
    'files:update_all',
    'files:delete',
    'files:reassign',
    'documents:create',
    'documents:read_all',
    'documents:update_all',
    'documents:delete',
    'reports:read_all',
    'reports:export',
    'users:read_all',
    'users:manage',
    'settings:manage',
  ],
}

// Human-readable permission descriptions
export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'files:create': 'Register new files',
  'files:read_own': 'View assigned files',
  'files:read_all': 'View all files',
  'files:update_own': 'Update assigned files (limited)',
  'files:update_all': 'Edit all files',
  'files:delete': 'Delete files',
  'files:reassign': 'Reassign files to other users',
  'documents:create': 'Upload documents',
  'documents:read_own': 'View own documents',
  'documents:read_all': 'View all documents',
  'documents:update_own': 'Update own documents',
  'documents:update_all': 'Update all documents',
  'documents:delete': 'Delete documents',
  'reports:read_own': 'View restricted reports',
  'reports:read_all': 'Access comprehensive reports',
  'reports:export': 'Export reports',
  'users:read_all': 'View all users',
  'users:manage': 'Manage user accounts',
  'settings:manage': 'Manage system settings',
}
