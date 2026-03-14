import { createClient } from '@/lib/supabase/server';
import { UserProfile, UserRole, Permission, hasPermission } from './types';

// Server-side function to get current user's profile with role
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  
  return profile as UserProfile;
}

// Server-side function to get current user's role
export async function getCurrentUserRole(): Promise<UserRole> {
  const profile = await getCurrentUserProfile();
  return profile?.role ?? 'user';
}

// Server-side permission check
export async function checkPermission(permission: Permission): Promise<boolean> {
  const role = await getCurrentUserRole();
  return hasPermission(role, permission);
}

// Server-side check if user is supervisor
export async function isSupervisor(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'supervisor';
}

// Require specific permission - throws error if not authorized
export async function requirePermission(permission: Permission): Promise<void> {
  const hasAccess = await checkPermission(permission);
  if (!hasAccess) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

// Require supervisor role - throws error if not supervisor
export async function requireSupervisor(): Promise<void> {
  const isSup = await isSupervisor();
  if (!isSup) {
    throw new Error('Supervisor access required');
  }
}

// Get user profile by ID (for supervisors viewing other users)
export async function getUserProfileById(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient();
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  
  return profile as UserProfile;
}

// Get all user profiles (for supervisors)
export async function getAllUserProfiles(): Promise<UserProfile[]> {
  const supabase = await createClient();
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
  
  return profiles as UserProfile[];
}

// Update user profile (respects RLS policies)
export async function updateUserProfile(
  userId: string, 
  updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}
