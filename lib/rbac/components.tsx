'use client'

import { ReactNode } from 'react'
import { useRBAC } from './context'
import { PermissionString, RoleName } from './types'

interface PermissionGateProps {
  children: ReactNode
  permission: PermissionString
  fallback?: ReactNode
}

// Show content only if user has the specific permission
export function PermissionGate({ children, permission, fallback = null }: PermissionGateProps) {
  const { hasPermission } = useRBAC()
  
  if (!hasPermission(permission)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

interface AnyPermissionGateProps {
  children: ReactNode
  permissions: PermissionString[]
  fallback?: ReactNode
}

// Show content if user has any of the specified permissions
export function AnyPermissionGate({ children, permissions, fallback = null }: AnyPermissionGateProps) {
  const { hasAnyPermission } = useRBAC()
  
  if (!hasAnyPermission(permissions)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

interface AllPermissionsGateProps {
  children: ReactNode
  permissions: PermissionString[]
  fallback?: ReactNode
}

// Show content only if user has all specified permissions
export function AllPermissionsGate({ children, permissions, fallback = null }: AllPermissionsGateProps) {
  const { hasAllPermissions } = useRBAC()
  
  if (!hasAllPermissions(permissions)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

interface RoleGateProps {
  children: ReactNode
  roles: RoleName[]
  fallback?: ReactNode
}

// Show content only if user has one of the specified roles
export function RoleGate({ children, roles, fallback = null }: RoleGateProps) {
  const { role } = useRBAC()
  
  if (!role || !roles.includes(role)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

interface SupervisorOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

// Convenience component for supervisor-only content
export function SupervisorOnly({ children, fallback = null }: SupervisorOnlyProps) {
  const { isSupervisor } = useRBAC()
  
  if (!isSupervisor) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

interface GeneralUserOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

// Convenience component for general user-only content
export function GeneralUserOnly({ children, fallback = null }: GeneralUserOnlyProps) {
  const { isGeneralUser } = useRBAC()
  
  if (!isGeneralUser) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

interface AuthenticatedOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

// Show content only if user is authenticated
export function AuthenticatedOnly({ children, fallback = null }: AuthenticatedOnlyProps) {
  const { isAuthenticated } = useRBAC()
  
  if (!isAuthenticated) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

// Disabled wrapper that grays out and disables interaction for unauthorized content
interface DisabledWrapperProps {
  children: ReactNode
  disabled: boolean
  message?: string
}

export function DisabledWrapper({ children, disabled, message = 'You do not have permission to access this feature' }: DisabledWrapperProps) {
  if (!disabled) {
    return <>{children}</>
  }
  
  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
        <p className="text-sm text-muted-foreground text-center px-4">{message}</p>
      </div>
    </div>
  )
}

// Permission-based disabled wrapper
interface PermissionDisabledWrapperProps {
  children: ReactNode
  permission: PermissionString
  message?: string
}

export function PermissionDisabledWrapper({ children, permission, message }: PermissionDisabledWrapperProps) {
  const { hasPermission } = useRBAC()
  const disabled = !hasPermission(permission)
  
  return (
    <DisabledWrapper disabled={disabled} message={message}>
      {children}
    </DisabledWrapper>
  )
}
