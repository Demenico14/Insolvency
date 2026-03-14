'use server'

import { createClient } from '@/lib/supabase/server'
import { RoleName, ROLE_PERMISSIONS, UserWithRole, UserProfile } from './types'

// Get the current user with their role and permissions
export async function getCurrentUserWithRole(): Promise<UserWithRole | null> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return null
  }

  // Get user profile with role
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select(`
      *,
      role:roles(*)
    `)
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    // Return default general_user role if no profile exists
    return {
      id: user.id,
      email: user.email || '',
      profile: null,
      role: 'general_user',
      permissions: ROLE_PERMISSIONS.general_user,
    }
  }

  const roleName = (profile.role?.name || 'general_user') as RoleName
  
  return {
    id: user.id,
    email: user.email || '',
    profile: profile as UserProfile,
    role: roleName,
    permissions: ROLE_PERMISSIONS[roleName] || ROLE_PERMISSIONS.general_user,
  }
}

// Check if user has a specific permission
export async function hasPermission(permission: string): Promise<boolean> {
  const user = await getCurrentUserWithRole()
  
  if (!user) {
    return false
  }

  return user.permissions.includes(permission)
}

// Check if user has any of the specified permissions
export async function hasAnyPermission(permissions: string[]): Promise<boolean> {
  const user = await getCurrentUserWithRole()
  
  if (!user) {
    return false
  }

  return permissions.some(permission => user.permissions.includes(permission))
}

// Check if user has all of the specified permissions
export async function hasAllPermissions(permissions: string[]): Promise<boolean> {
  const user = await getCurrentUserWithRole()
  
  if (!user) {
    return false
  }

  return permissions.every(permission => user.permissions.includes(permission))
}

// Check if user is a supervisor
export async function isSupervisor(): Promise<boolean> {
  const user = await getCurrentUserWithRole()
  return user?.role === 'supervisor'
}

// Check if user is a general user
export async function isGeneralUser(): Promise<boolean> {
  const user = await getCurrentUserWithRole()
  return user?.role === 'general_user'
}

// Get user's role
export async function getUserRole(): Promise<RoleName | null> {
  const user = await getCurrentUserWithRole()
  return user?.role || null
}

// Assign role to user (for signup/admin operations)
export async function assignRoleToUser(
  userId: string, 
  roleName: RoleName,
  additionalData?: {
    firstName?: string
    lastName?: string
    department?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get role ID
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .single()

  if (roleError || !role) {
    return { success: false, error: 'Role not found' }
  }

  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existingProfile) {
    // Update existing profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        role_id: role.id,
        first_name: additionalData?.firstName,
        last_name: additionalData?.lastName,
        department: additionalData?.department,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }
  } else {
    // Create new profile
    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        role_id: role.id,
        first_name: additionalData?.firstName,
        last_name: additionalData?.lastName,
        department: additionalData?.department,
      })

    if (insertError) {
      return { success: false, error: insertError.message }
    }
  }

  return { success: true }
}

// Get all users with their roles (supervisor only)
export async function getAllUsersWithRoles(): Promise<UserWithRole[]> {
  const currentUser = await getCurrentUserWithRole()
  
  if (!currentUser || currentUser.role !== 'supervisor') {
    return []
  }

  const supabase = await createClient()

  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select(`
      *,
      role:roles(*)
    `)
    .order('created_at', { ascending: false })

  if (error || !profiles) {
    return []
  }

  // Get auth users to match emails
  const { data: authUsers } = await supabase.auth.admin.listUsers()

  return profiles.map(profile => {
    const authUser = authUsers?.users?.find(u => u.id === profile.user_id)
    const roleName = (profile.role?.name || 'general_user') as RoleName
    
    return {
      id: profile.user_id,
      email: authUser?.email || 'Unknown',
      profile: profile as UserProfile,
      role: roleName,
      permissions: ROLE_PERMISSIONS[roleName] || ROLE_PERMISSIONS.general_user,
    }
  })
}

// Update user role (supervisor only)
export async function updateUserRole(
  userId: string,
  newRole: RoleName
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getCurrentUserWithRole()
  
  if (!currentUser || currentUser.role !== 'supervisor') {
    return { success: false, error: 'Unauthorized' }
  }

  return assignRoleToUser(userId, newRole)
}

// Deactivate user (supervisor only)
export async function deactivateUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getCurrentUserWithRole()
  
  if (!currentUser || currentUser.role !== 'supervisor') {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('user_profiles')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Reactivate user (supervisor only)
export async function reactivateUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getCurrentUserWithRole()
  
  if (!currentUser || currentUser.role !== 'supervisor') {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('user_profiles')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
