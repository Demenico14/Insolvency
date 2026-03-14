import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body as { userId: string }

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existingProfile) {
      // Profile exists, nothing to do
      return NextResponse.json({ success: true, message: 'Profile already exists' })
    }

    // Get default role (general_user)
    const { data: defaultRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'general_user')
      .single()

    // Create profile with or without role_id depending on whether roles table exists
    const profileData: {
      user_id: string
      is_active: boolean
      role_id?: string
    } = {
      user_id: userId,
      is_active: true,
    }

    if (defaultRole && !roleError) {
      profileData.role_id = defaultRole.id
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert(profileData)

    if (profileError) {
      // Profile might not be creatable yet if tables don't exist
      console.error('Profile creation error:', profileError)
      return NextResponse.json({ success: true, message: 'Profile creation skipped' })
    }

    return NextResponse.json({ success: true, message: 'Profile created' })
  } catch (error) {
    console.error('Ensure profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
