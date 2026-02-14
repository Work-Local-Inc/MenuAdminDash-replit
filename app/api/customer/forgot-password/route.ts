export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/emails/client'
import PasswordResetEmail from '@/lib/emails/templates/password-reset'
import crypto from 'crypto'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

function generatePlainText(firstName: string, resetLink: string, expiresIn: string): string {
  const lines: string[] = []

  lines.push('========================================')
  lines.push('       MENU.CA PASSWORD RESET')
  lines.push('========================================')
  lines.push('')
  lines.push(`Hi ${firstName},`)
  lines.push('')
  lines.push('We received a request to reset the password for your account.')
  lines.push('')
  lines.push(`Click the link below to reset your password. This link will expire in ${expiresIn}.`)
  lines.push('')
  lines.push('Reset Password:')
  lines.push(resetLink)
  lines.push('')
  lines.push('----------------------------------------')
  lines.push('')
  lines.push("If you didn't request a password reset, you can safely ignore this email.")
  lines.push('Your password will remain unchanged.')
  lines.push('')
  lines.push('Security Tips:')
  lines.push('- Never share your password with anyone')
  lines.push('- Use a unique password for Menu.ca')
  lines.push('- Enable two-factor authentication when available')
  lines.push('')
  lines.push('========================================')
  lines.push('Need help? Contact our support team.')
  lines.push('Powered by Menu.ca - Connecting you with local restaurants')
  lines.push('========================================')

  return lines.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, redirectUrl } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('[Forgot Password] RESEND_API_KEY is not configured')
      return NextResponse.json(
        { error: 'Email service is not configured' },
        { status: 500 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    console.log('[Forgot Password] Password reset requested for:', normalizedEmail)

    const supabaseAdmin = createAdminClient()

    let { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: {
        redirectTo: redirectUrl || undefined,
      },
    })

    if (linkError && (linkError.message?.includes('not found') || linkError.message?.includes('User not found') || linkError.message?.includes('Unable to find'))) {
      console.log('[Forgot Password] User not found in Supabase Auth, auto-creating account for:', normalizedEmail)

      const tempPassword = crypto.randomBytes(32).toString('hex')

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
      })

      if (createError) {
        console.error('[Forgot Password] Failed to auto-create user:', createError.message)
        return NextResponse.json(
          { error: 'Failed to process password reset' },
          { status: 500 }
        )
      }

      console.log('[Forgot Password] Auto-created user:', newUser.user.id)

      const retryResult = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
        options: {
          redirectTo: redirectUrl || undefined,
        },
      })

      linkData = retryResult.data
      linkError = retryResult.error
    }

    if (linkError) {
      console.error('[Forgot Password] Error generating reset link:', linkError.message)

      if (linkError.message?.includes('rate') || linkError.message?.includes('Rate')) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to generate reset link' },
        { status: 500 }
      )
    }

    if (!linkData?.properties?.action_link) {
      console.error('[Forgot Password] No action link returned from Supabase')
      return NextResponse.json(
        { error: 'Failed to generate reset link' },
        { status: 500 }
      )
    }

    const supabaseActionLink = linkData.properties.action_link
    const hashedToken = linkData.properties.hashed_token
    console.log('[Forgot Password] Supabase action_link:', supabaseActionLink)
    console.log('[Forgot Password] hashed_token available:', !!hashedToken)

    let resetLink: string
    if (redirectUrl && hashedToken) {
      const baseOrigin = new URL(redirectUrl).origin
      const verifyUrl = new URL('/auth/confirm', baseOrigin)
      verifyUrl.searchParams.set('token_hash', hashedToken)
      verifyUrl.searchParams.set('type', 'recovery')
      verifyUrl.searchParams.set('next', '/customer/reset-password')
      resetLink = verifyUrl.toString()
      console.log('[Forgot Password] Constructed reset link:', resetLink)
    } else {
      resetLink = supabaseActionLink
      console.log('[Forgot Password] Using Supabase action_link as fallback')
    }

    const firstName = linkData.user?.user_metadata?.first_name
      || linkData.user?.user_metadata?.firstName
      || linkData.user?.user_metadata?.name?.split(' ')[0]
      || 'there'

    const expiresIn = '1 hour'

    const rawEmail = FROM_EMAIL.includes('<') ? FROM_EMAIL.match(/<(.+)>/)?.[1] || FROM_EMAIL : FROM_EMAIL
    const fromAddress = `Menu.ca <${rawEmail}>`
    const plainText = generatePlainText(firstName, resetLink, expiresIn)

    console.log('[Forgot Password] Sending email via Resend to:', normalizedEmail, 'from:', fromAddress)

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromAddress,
      to: normalizedEmail,
      subject: 'Reset Your Menu.ca Password',
      react: PasswordResetEmail({ firstName, resetLink, expiresIn }),
      text: plainText,
    })

    if (emailError) {
      console.error('[Forgot Password] Error sending email via Resend:', emailError)
      return NextResponse.json(
        { error: 'Failed to send reset email' },
        { status: 500 }
      )
    }

    console.log('[Forgot Password] Password reset email sent successfully to:', normalizedEmail, 'Resend ID:', emailData?.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Forgot Password] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
