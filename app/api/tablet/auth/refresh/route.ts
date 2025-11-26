import { NextRequest, NextResponse } from 'next/server'
import { deviceRefreshSchema } from '@/lib/validations/tablet'
import { refreshSessionToken } from '@/lib/tablet/auth'

/**
 * POST /api/tablet/auth/refresh
 *
 * Refresh an expiring session token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = deviceRefreshSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { session_token } = validation.data

    // Refresh the session
    const newSession = await refreshSessionToken(session_token)

    if (!newSession) {
      return NextResponse.json(
        { error: 'Invalid or expired session. Please login again.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      session_token: newSession.session_token,
      expires_at: newSession.expires_at,
    })
  } catch (error: any) {
    console.error('[Device Refresh] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Token refresh failed' },
      { status: 500 }
    )
  }
}
