export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/emails/client'
import PasswordResetEmail from '@/lib/emails/templates/password-reset'

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

    console.log('[Forgot Password] Password reset requested for:', email)

    const supabaseAdmin = createAdminClient()

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: redirectUrl || undefined,
      },
    })

    if (linkError) {
      console.error('[Forgot Password] Error generating reset link:', linkError.message)

      if (linkError.message?.includes('rate') || linkError.message?.includes('Rate')) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        )
      }

      if (linkError.message?.includes('not found') || linkError.message?.includes('User not found')) {
        console.log('[Forgot Password] User not found, returning success to prevent email enumeration')
        return NextResponse.json({ success: true })
      }

      return NextResponse.json(
        { error: 'Failed to generate reset link' },
        { status: 500 }
      )
    }

    const resetLink = linkData.properties.action_link

    const firstName = linkData.user?.user_metadata?.first_name
      || linkData.user?.user_metadata?.firstName
      || linkData.user?.user_metadata?.name?.split(' ')[0]
      || 'there'

    const expiresIn = '1 hour'

    const rawEmail = FROM_EMAIL.includes('<') ? FROM_EMAIL.match(/<(.+)>/)?.[1] || FROM_EMAIL : FROM_EMAIL
    const fromAddress = `Menu.ca <${rawEmail}>`
    const plainText = generatePlainText(firstName, resetLink, expiresIn)

    const { error: emailError } = await resend.emails.send({
      from: fromAddress,
      to: email,
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

    console.log('[Forgot Password] Password reset email sent successfully to:', email)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Forgot Password] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
