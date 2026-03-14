'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/rbac/server'
import { RoleName, ROLE_PERMISSIONS } from '@/lib/rbac/types'

export interface UserRecord {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  department: string | null
  role_name: RoleName
  role_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  last_sign_in: string | null
}

export interface UsersFilter {
  search?: string
  role?: string
  status?: string
}

// Get all users (supervisor only)
export async function getUsers(
  filters: UsersFilter = {},
  page = 1,
  pageSize = 10
): Promise<{
  users: UserRecord[]
  totalCount: number
  totalPages: number
}> {
  const currentUser = await getCurrentUserWithRole()
  
  if (!currentUser || currentUser.role !== 'supervisor') {
    return { users: [], totalCount: 0, totalPages: 0 }
  }

  const supabase = await createClient()

  // Start building the query
  let query = supabase
    .from('user_profiles')
    .select(`
      id,
      user_id,
      first_name,
      last_name,
      department,
      is_active,
      created_at,
      updated_at,
      role_id,
      role:roles(id, name)
    `, { count: 'exact' })

  // Apply filters
  if (filters.search) {
    query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,department.ilike.%${filters.search}%`)
  }

  if (filters.status === 'active') {
    query = query.eq('is_active', true)
  } else if (filters.status === 'inactive') {
    query = query.eq('is_active', false)
  }

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: profiles, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error || !profiles) {
    console.error('Error fetching users:', error)
    return { users: [], totalCount: 0, totalPages: 0 }
  }

  // Get auth user data for emails
  const userIds = profiles.map(p => p.user_id)
  
  // Map profiles to UserRecord
  const users: UserRecord[] = profiles.map(profile => {
    const roleName = (profile.role?.name || 'general_user') as RoleName
    
    return {
      id: profile.user_id,
      email: 'Loading...', // Will be populated separately
      first_name: profile.first_name,
      last_name: profile.last_name,
      department: profile.department,
      role_name: roleName,
      role_id: profile.role_id,
      is_active: profile.is_active,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      last_sign_in: null,
    }
  })

  // Filter by role if specified
  let filteredUsers = users
  if (filters.role && filters.role !== 'all') {
    filteredUsers = users.filter(u => u.role_name === filters.role)
  }

  const totalCount = count || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  return {
    users: filteredUsers,
    totalCount,
    totalPages,
  }
}

// Update user role
export async function updateUserRole(
  userId: string,
  newRole: RoleName
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getCurrentUserWithRole()
  
  if (!currentUser || currentUser.role !== 'supervisor') {
    return { success: false, error: 'Unauthorized' }
  }

  // Prevent changing own role
  if (currentUser.id === userId) {
    return { success: false, error: 'Cannot change your own role' }
  }

  const supabase = await createClient()

  // Get role ID
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', newRole)
    .single()

  if (roleError || !role) {
    return { success: false, error: 'Role not found' }
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({ role_id: role.id, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Toggle user active status
export async function toggleUserStatus(
  userId: string
): Promise<{ success: boolean; error?: string; newStatus?: boolean }> {
  const currentUser = await getCurrentUserWithRole()
  
  if (!currentUser || currentUser.role !== 'supervisor') {
    return { success: false, error: 'Unauthorized' }
  }

  // Prevent deactivating self
  if (currentUser.id === userId) {
    return { success: false, error: 'Cannot change your own status' }
  }

  const supabase = await createClient()

  // Get current status
  const { data: profile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('is_active')
    .eq('user_id', userId)
    .single()

  if (fetchError || !profile) {
    return { success: false, error: 'User not found' }
  }

  const newStatus = !profile.is_active

  const { error } = await supabase
    .from('user_profiles')
    .update({ is_active: newStatus, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, newStatus }
}

// Get roles for dropdown
export async function getRoles(): Promise<{ id: string; name: string; description: string }[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('roles')
    .select('id, name, description')
    .order('name')

  if (error || !data) {
    // Return default roles if table doesn't exist yet
    return [
      { id: '1', name: 'general_user', description: 'Standard user with limited access' },
      { id: '2', name: 'supervisor', description: 'Full access to all features' },
    ]
  }

  return data
}

// Get user statistics
export async function getUserStats(): Promise<{
  totalUsers: number
  activeUsers: number
  supervisors: number
  generalUsers: number
}> {
  const currentUser = await getCurrentUserWithRole()
  
  if (!currentUser || currentUser.role !== 'supervisor') {
    return { totalUsers: 0, activeUsers: 0, supervisors: 0, generalUsers: 0 }
  }

  const supabase = await createClient()

  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select(`
      is_active,
      role:roles(name)
    `)

  if (error || !profiles) {
    return { totalUsers: 0, activeUsers: 0, supervisors: 0, generalUsers: 0 }
  }

  return {
    totalUsers: profiles.length,
    activeUsers: profiles.filter(p => p.is_active).length,
    supervisors: profiles.filter(p => p.role?.name === 'supervisor').length,
    generalUsers: profiles.filter(p => p.role?.name === 'general_user' || !p.role).length,
  }
}
