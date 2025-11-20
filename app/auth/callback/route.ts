import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
      // Check if user record exists in menuca_v3.users
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .single()

      // If user doesn't exist, create user record
      if (!existingUser && userError?.code === 'PGRST116') {
        console.log('[Auth Callback] Creating user record for new Google user:', data.user.email)
        
        try {
          // Call signup API to create user record
          const response = await fetch(`${requestUrl.origin}/api/customer/signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              auth_user_id: data.user.id,
              email: data.user.email,
              first_name: data.user.user_metadata?.full_name?.split(' ')[0] || '',
              last_name: data.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
              phone: data.user.user_metadata?.phone || null,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            console.error('[Auth Callback] Error creating user record:', errorData)
          }
        } catch (err) {
          console.error('[Auth Callback] Exception calling signup API:', err)
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
    }

    // Redirect to intended page
    return NextResponse.redirect(`${requestUrl.origin}${redirect}`)
  }

  // If no code, redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/customer/login`)
}
