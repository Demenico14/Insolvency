// Role-Based Access Control Types

export type UserRole = 'user' | 'supervisor';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  department: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Permission definitions for different features
export type Permission = 
  // File permissions
  | 'files:view_own'
  | 'files:view_all'
  | 'files:create'
  | 'files:edit_own'
  | 'files:edit_all'
  | 'files:delete'
  | 'files:reassign'
  | 'files:upload_documents'
  // Report permissions
  | 'reports:view_basic'
  | 'reports:view_full'
  | 'reports:export'
  // User management permissions
  | 'users:view'
  | 'users:create'
  | 'users:edit'
  | 'users:delete'
  | 'users:change_role';

// Role-to-permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: [
    'files:view_own',
    'files:create',
    'files:edit_own',
    'files:upload_documents',
    'reports:view_basic',
  ],
  supervisor: [
    'files:view_own',
    'files:view_all',
    'files:create',
    'files:edit_own',
    'files:edit_all',
    'files:delete',
    'files:reassign',
    'files:upload_documents',
    'reports:view_basic',
    'reports:view_full',
    'reports:export',
    'users:view',
    'users:create',
    'users:edit',
    'users:delete',
    'users:change_role',
  ],
};

// Helper function to check if a role has a permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// Helper to get all permissions for a role
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// Check multiple permissions (all must be true)
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

// Check multiple permissions (at least one must be true)
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}
