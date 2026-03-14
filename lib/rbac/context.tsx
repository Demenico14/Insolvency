'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { 
  UserProfile, 
  UserRole, 
  Permission, 
  hasPermission, 
  hasAllPermissions, 
  hasAnyPermission 
} from './types';

interface RBACContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isLoading: boolean;
  isSupervisor: boolean;
  isUser: boolean;
  can: (permission: Permission) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  refreshProfile: () => Promise<void>;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export function RBACProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    return data as UserProfile;
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        
        if (currentUser) {
          const profileData = await fetchProfile(currentUser.id);
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          const profileData = await fetchProfile(currentUser.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const role: UserRole = profile?.role ?? 'user';
  const isSupervisor = role === 'supervisor';
  const isUser = role === 'user';

  const can = useCallback(
    (permission: Permission) => hasPermission(role, permission),
    [role]
  );

  const canAll = useCallback(
    (permissions: Permission[]) => hasAllPermissions(role, permissions),
    [role]
  );

  const canAny = useCallback(
    (permissions: Permission[]) => hasAnyPermission(role, permissions),
    [role]
  );

  return (
    <RBACContext.Provider
      value={{
        user,
        profile,
        role,
        isLoading,
        isSupervisor,
        isUser,
        can,
        canAll,
        canAny,
        refreshProfile,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC() {
  const context = useContext(RBACContext);
  if (context === undefined) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
}
