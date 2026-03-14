import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RoleName } from '@/lib/rbac/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, role, firstName, lastName, department } = body as {
      userId: string
      role: RoleName
      firstName?: string
      lastName?: string
      department?: string
    }

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['general_user', 'supervisor'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get role ID
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', role)
      .single()

    if (roleError) {
      // If roles table doesn't exist yet, create a default profile without role_id
      console.error('Role lookup error:', roleError)
      
      // Try to create profile without role_id (will use default)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          first_name: firstName || null,
          last_name: lastName || null,
          department: department || null,
          is_active: true,
        }, {
          onConflict: 'user_id'
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, message: 'Profile created without role' })
    }

    // Create or update user profile with role
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        role_id: roleData.id,
        first_name: firstName || null,
        last_name: lastName || null,
        department: department || null,
        is_active: true,
      }, {
        onConflict: 'user_id'
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Assign role error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
