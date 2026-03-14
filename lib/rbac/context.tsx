'use client'

import { createContext, useContext, ReactNode } from 'react'
import { RoleName, PermissionString, ROLE_PERMISSIONS, UserWithRole } from './types'

interface RBACContextType {
  user: UserWithRole | null
  role: RoleName | null
  permissions: PermissionString[]
  hasPermission: (permission: PermissionString) => boolean
  hasAnyPermission: (permissions: PermissionString[]) => boolean
  hasAllPermissions: (permissions: PermissionString[]) => boolean
  isSupervisor: boolean
  isGeneralUser: boolean
  isAuthenticated: boolean
}

const RBACContext = createContext<RBACContextType | undefined>(undefined)

interface RBACProviderProps {
  children: ReactNode
  user: UserWithRole | null
}

export function RBACProvider({ children, user }: RBACProviderProps) {
  const role = user?.role || null
  const permissions = user?.permissions || []

  const hasPermission = (permission: PermissionString): boolean => {
    return permissions.includes(permission)
  }

  const hasAnyPermission = (perms: PermissionString[]): boolean => {
    return perms.some(permission => permissions.includes(permission))
  }

  const hasAllPermissions = (perms: PermissionString[]): boolean => {
    return perms.every(permission => permissions.includes(permission))
  }

  const value: RBACContextType = {
    user,
    role,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSupervisor: role === 'supervisor',
    isGeneralUser: role === 'general_user',
    isAuthenticated: !!user,
  }

  return (
    <RBACContext.Provider value={value}>
      {children}
    </RBACContext.Provider>
  )
}

export function useRBAC(): RBACContextType {
  const context = useContext(RBACContext)
  
  if (context === undefined) {
    throw new Error('useRBAC must be used within an RBACProvider')
  }
  
  return context
}

// Convenience hooks
export function usePermission(permission: PermissionString): boolean {
  const { hasPermission } = useRBAC()
  return hasPermission(permission)
}

export function useIsSupervisor(): boolean {
  const { isSupervisor } = useRBAC()
  return isSupervisor
}

export function useIsGeneralUser(): boolean {
  const { isGeneralUser } = useRBAC()
  return isGeneralUser
}

export function useUserRole(): RoleName | null {
  const { role } = useRBAC()
  return role
}
