import { NextRequest, NextResponse } from 'next/server'
import { validateSessionToken } from './auth'
import type { VerifiedDeviceContext } from '@/types/tablet'

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return null

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null
  }

  return parts[1]
}

/**
 * Verify device authentication for tablet API endpoints
 * Returns the verified device context or throws an error response
 */
export async function verifyDeviceAuth(
  request: NextRequest
): Promise<VerifiedDeviceContext | NextResponse> {
  const token = extractBearerToken(request)

  if (!token) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401 }
    )
  }

  const deviceContext = await validateSessionToken(token)

  if (!deviceContext) {
    return NextResponse.json(
      { error: 'Invalid or expired session token' },
      { status: 401 }
    )
  }

  if (!deviceContext.restaurant_id) {
    return NextResponse.json(
      { error: 'Device not assigned to a restaurant' },
      { status: 403 }
    )
  }

  return deviceContext
}

/**
 * Helper to check if verification result is an error response
 */
export function isAuthError(
  result: VerifiedDeviceContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse
}

/**
 * Rate limiting helper for tablet endpoints
 * Simple in-memory rate limiting (use Redis in production for multi-instance)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60 // 60 requests per minute

export function checkRateLimit(deviceId: number): boolean {
  const key = `device:${deviceId}`
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || entry.resetAt < now) {
    // Reset or create new entry
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  entry.count++
  return true
}

/**
 * Create rate limit error response
 */
export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please slow down.' },
    {
      status: 429,
      headers: {
        'Retry-After': '60',
      }
    }
  )
}
