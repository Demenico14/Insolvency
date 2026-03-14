import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, firstName, lastName, department } = body as {
      userId: string
      firstName?: string
      lastName?: string
      department?: string
    }

    // Security: role is NEVER read from the request body.
    // Public signup always produces a general_user — period.
    const ENFORCED_ROLE = 'general_user'

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Resolve the general_user role ID from the DB
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', ENFORCED_ROLE)
      .single()

    if (roleError || !roleData) {
      console.error('Role lookup error:', roleError)
      return NextResponse.json(
        { error: 'Role configuration error — contact an administrator' },
        { status: 500 }
      )
    }

    // Upsert the profile with the enforced role
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          role_id: roleData.id,
          first_name: firstName ?? null,
          last_name: lastName ?? null,
          department: department ?? null,
          is_active: true,
        },
        { onConflict: 'user_id' }
      )

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, role: ENFORCED_ROLE })
  } catch (error) {
    console.error('Assign role error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}