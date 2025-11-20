import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureOAuthProfileForSession } from '@/lib/auth/oauth-profile'
import { z } from 'zod'

// OAuth profile creation schema (no password required)
const oauthProfileSchema = z.object({
  auth_user_id: z.string().uuid('Invalid auth user ID'),
  email: z.string().email('Invalid email address'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify the caller has a valid session
    const supabaseClient = await createClient()
    const { data: { user: sessionUser }, error: sessionError } = await supabaseClient.auth.getUser()
    
    if (sessionError || !sessionUser) {
      return NextResponse.json(
        { error: 'Unauthorized - valid session required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    const validation = oauthProfileSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { auth_user_id, email, first_name, last_name, phone } = validation.data

    // SECURITY: Verify the session user matches the auth_user_id being created
    if (sessionUser.id !== auth_user_id) {
      return NextResponse.json(
        { error: 'Forbidden - can only create profile for authenticated user' },
        { status: 403 }
      )
    }

    // SECURITY: Verify the session email matches the profile email to prevent hijacking
    if (sessionUser.email !== email) {
      return NextResponse.json(
        { error: 'Forbidden - session email does not match profile email' },
        { status: 403 }
      )
    }

    // SECURITY: Check email verification - require non-null timestamp
    const emailVerified = !!sessionUser.email_confirmed_at || !!sessionUser.confirmed_at

    // Use shared helper to ensure OAuth profile with all security checks
    const result = await ensureOAuthProfileForSession({
      authUserId: auth_user_id,
      email,
      emailVerified,
      firstName: first_name,
      lastName: last_name,
      phone,
    })

    if (!result.success) {
      console.error('[OAuth Profile API] Failed to ensure profile:', result.error)
      return NextResponse.json(
        { error: result.error || 'Failed to create profile' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        userId: result.userId,
        message: 'User profile created successfully'
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[OAuth Profile API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
