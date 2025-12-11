import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

/**
 * PUT /api/customer/profile
 * Update current user's profile data (first_name, last_name, phone)
 * Email changes are not allowed as they require verification
 */
export async function PUT(request: NextRequest) {
  console.log('[Profile API] PUT request received')
  
  try {
    const supabase = await createClient() as any
    
    // Get current auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('[Profile API] PUT - Not authenticated')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('[Profile API] PUT - Auth user:', user.id)

    // Parse request body
    const body = await request.json()
    const { first_name, last_name, phone } = body

    // Validate input - at least one field should be provided
    if (first_name === undefined && last_name === undefined && phone === undefined) {
      return NextResponse.json(
        { error: 'No fields to update. Provide first_name, last_name, or phone.' },
        { status: 400 }
      )
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {}
    if (first_name !== undefined) updateData.first_name = first_name?.trim() || null
    if (last_name !== undefined) updateData.last_name = last_name?.trim() || null
    if (phone !== undefined) updateData.phone = phone?.trim() || null

    console.log('[Profile API] PUT - Updating fields:', Object.keys(updateData))

    // Update user profile
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('auth_user_id', user.id)
      .select('id, email, first_name, last_name, phone, stripe_customer_id')
      .single()

    if (updateError) {
      console.error('[Profile API] PUT - Update error:', updateError.message)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    console.log('[Profile API] PUT - Profile updated successfully:', updatedUser.id)
    return NextResponse.json({ user: updatedUser }, { status: 200 })
    
  } catch (error: any) {
    console.error('[Profile API] PUT - Unexpected error:', error.message)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
