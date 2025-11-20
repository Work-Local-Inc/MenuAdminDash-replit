import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ensureOAuthProfileForSession } from '@/lib/auth/oauth-profile'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirect = requestUrl.searchParams.get('redirect') || '/customer/account'

  if (code) {
    const supabase = await createClient()
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('[Auth Callback] Error exchanging code:', error)
      return NextResponse.redirect(`${requestUrl.origin}/customer/login?error=${encodeURIComponent(error.message)}`)
    }

    if (data.user) {
      // SECURITY: Check email verification - require non-null timestamp
      // Note: For OAuth providers like Google, email is verified by the provider
      const emailVerified = !!data.user.email_confirmed_at || !!data.user.confirmed_at

      // Use shared helper to ensure OAuth profile with all security checks
      const result = await ensureOAuthProfileForSession({
        authUserId: data.user.id,
        email: data.user.email || '',
        emailVerified,
        firstName: data.user.user_metadata?.full_name?.split(' ')[0] || '',
        lastName: data.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        phone: data.user.user_metadata?.phone || null,
      })

      if (!result.success) {
        console.error('[Auth Callback] Failed to ensure OAuth profile:', result.error)
        return NextResponse.redirect(
          `${requestUrl.origin}/customer/login?error=${encodeURIComponent(result.error || 'Failed to create profile')}`
        )
      }

      // Send welcome email (don't fail auth if email fails)
      try {
        await fetch(`${requestUrl.origin}/api/customer/welcome-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      } catch (emailError) {
        console.error('[Auth Callback] Failed to send welcome email:', emailError)
      }
    }

    // Redirect to intended page
    return NextResponse.redirect(`${requestUrl.origin}${redirect}`)
  }

  // If no code, redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/customer/login`)
}
