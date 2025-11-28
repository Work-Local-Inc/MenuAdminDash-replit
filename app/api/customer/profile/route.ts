import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/customer/profile
 * Get current user's profile data
 * Uses server-side Supabase client which bypasses RLS
 */
export async function GET() {
  console.log('[Profile API] Request received')
  
  try {
    console.log('[Profile API] Creating Supabase client...')
    const supabase = await createClient() as any
    console.log('[Profile API] Supabase client created')
    
    // Get current auth user with timeout
    console.log('[Profile API] Getting auth user...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.log('[Profile API] Auth error (not critical):', authError.message)
      return NextResponse.json({ user: null }, { status: 200 })
    }
    
    if (!user) {
      console.log('[Profile API] No auth user - guest mode')
      return NextResponse.json({ user: null }, { status: 200 })
    }

    console.log('[Profile API] Auth user found:', user.id)

    // Get user profile from database
    console.log('[Profile API] Querying users table...')
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, stripe_customer_id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (userError) {
      console.error('[Profile API] Database error:', userError.message)
      // Return null user instead of 500 - allow guest checkout
      return NextResponse.json({ user: null }, { status: 200 })
    }

    if (!userData) {
      console.log('[Profile API] No user record - possibly new auth user')
      return NextResponse.json({ user: null }, { status: 200 })
    }

    console.log('[Profile API] Found user:', (userData as any).id, (userData as any).email)
    return NextResponse.json({ user: userData }, { status: 200 })
    
  } catch (error: any) {
    console.error('[Profile API] Unexpected error:', error.message)
    // Return null user instead of error - allow guest checkout
    return NextResponse.json({ user: null }, { status: 200 })
  }
}

