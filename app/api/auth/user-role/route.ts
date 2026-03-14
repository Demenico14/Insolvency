import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RoleName, ROLE_PERMISSIONS, UserWithRole } from '@/lib/rbac/types'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ user: null })
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
      const defaultUser: UserWithRole = {
        id: user.id,
        email: user.email || '',
        profile: null,
        role: 'general_user',
        permissions: ROLE_PERMISSIONS.general_user,
      }
      return NextResponse.json({ user: defaultUser })
    }

    const roleName = (profile.role?.name || 'general_user') as RoleName
    
    const userWithRole: UserWithRole = {
      id: user.id,
      email: user.email || '',
      profile: profile,
      role: roleName,
      permissions: ROLE_PERMISSIONS[roleName] || ROLE_PERMISSIONS.general_user,
    }

    return NextResponse.json({ user: userWithRole })
  } catch (error) {
    console.error('Get user role error:', error)
    return NextResponse.json({ user: null, error: 'Failed to get user role' })
  }
}
