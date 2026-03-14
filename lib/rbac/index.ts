// RBAC System Exports

// Types
export * from './types'

// Context and Hooks
export { 
  RBACProvider, 
  useRBAC, 
  usePermission, 
  useIsSupervisor, 
  useIsGeneralUser,
  useUserRole 
} from './context'

// Client-side hook for fetching user role
export { useUserWithRole } from './use-user-role'

// Components
export {
  PermissionGate,
  AnyPermissionGate,
  AllPermissionsGate,
  RoleGate,
  SupervisorOnly,
  GeneralUserOnly,
  AuthenticatedOnly,
  DisabledWrapper,
  PermissionDisabledWrapper,
} from './components'

// Server utilities
export {
  getCurrentUserWithRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isSupervisor,
  isGeneralUser,
  getUserRole,
  assignRoleToUser,
  getAllUsersWithRoles,
  updateUserRole,
  deactivateUser,
  reactivateUser,
} from './server'
