import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/customer/profile
 * Get current user's profile data
 * Uses server-side Supabase client which bypasses RLS
 */
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    console.log('[Profile API] Getting profile for auth user:', user.id)

    // Get user profile from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (userError) {
      console.error('[Profile API] Error fetching user:', userError)
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    if (!userData) {
      console.log('[Profile API] No user record found for auth user')
      return NextResponse.json({ user: null }, { status: 200 })
    }

    console.log('[Profile API] Found user:', userData.id, userData.email)
    return NextResponse.json({ user: userData }, { status: 200 })
    
  } catch (error: any) {
    console.error('[Profile API] Unexpected error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

