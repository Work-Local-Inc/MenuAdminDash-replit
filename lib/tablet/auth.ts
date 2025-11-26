import bcrypt from 'bcryptjs'
import { randomBytes, createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DeviceConfig, DeviceSession } from '@/types/tablet'

// Constants
const DEVICE_KEY_LENGTH = 32 // 256 bits
const SESSION_TOKEN_LENGTH = 48 // 384 bits
const SESSION_EXPIRY_HOURS = 24
const BCRYPT_ROUNDS = 12

/**
 * Generate a secure random device key
 * This is shown once during registration and must be stored securely by the device
 */
export function generateDeviceKey(): string {
  return randomBytes(DEVICE_KEY_LENGTH).toString('base64url')
}

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_LENGTH).toString('base64url')
}

/**
 * Hash a device key using bcrypt
 */
export async function hashDeviceKey(deviceKey: string): Promise<string> {
  return bcrypt.hash(deviceKey, BCRYPT_ROUNDS)
}

/**
 * Verify a device key against its hash
 */
export async function verifyDeviceKey(deviceKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(deviceKey, hash)
}

/**
 * Generate QR code data for easy device setup
 * Format: menuca://device/setup?uuid={uuid}&key={key}
 */
export function generateQRCodeData(deviceUuid: string, deviceKey: string): string {
  return `menuca://device/setup?uuid=${deviceUuid}&key=${encodeURIComponent(deviceKey)}`
}

/**
 * Calculate session expiry timestamp
 */
export function getSessionExpiry(): Date {
  const expiry = new Date()
  expiry.setHours(expiry.getHours() + SESSION_EXPIRY_HOURS)
  return expiry
}

/**
 * Create a new device session in the database
 */
export async function createDeviceSession(deviceId: number): Promise<{
  session_token: string
  expires_at: string
}> {
  const supabase = createAdminClient()
  const sessionToken = generateSessionToken()
  const expiresAt = getSessionExpiry()

  // First, invalidate any existing sessions for this device
  await supabase
    .from('device_sessions')
    .delete()
    .eq('device_id', deviceId)

  // Create new session
  const { data, error } = await supabase
    .from('device_sessions')
    .insert({
      device_id: deviceId,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
    })
    .select('session_token, expires_at')
    .single()

  if (error) {
    console.error('[Device Auth] Failed to create session:', error)
    throw new Error('Failed to create device session')
  }

  return {
    session_token: data.session_token,
    expires_at: data.expires_at,
  }
}

/**
 * Validate a session token and return the device info
 */
export async function validateSessionToken(sessionToken: string): Promise<{
  device_id: number
  device_uuid: string
  restaurant_id: number
  session_id: number
} | null> {
  const supabase = createAdminClient()

  // Get session with device info
  const { data: session, error } = await supabase
    .from('device_sessions')
    .select(`
      id,
      device_id,
      expires_at,
      devices!inner (
        id,
        uuid,
        restaurant_id,
        is_active
      )
    `)
    .eq('session_token', sessionToken)
    .single()

  if (error || !session) {
    return null
  }

  // Check if session is expired
  if (new Date(session.expires_at) < new Date()) {
    // Clean up expired session
    await supabase
      .from('device_sessions')
      .delete()
      .eq('id', session.id)
    return null
  }

  // Check if device is active
  const device = session.devices as any
  if (!device || !device.is_active) {
    return null
  }

  // Update last activity
  await supabase
    .from('device_sessions')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', session.id)

  return {
    device_id: device.id,
    device_uuid: device.uuid,
    restaurant_id: device.restaurant_id,
    session_id: session.id,
  }
}

/**
 * Refresh a session token (extend expiry)
 */
export async function refreshSessionToken(oldSessionToken: string): Promise<{
  session_token: string
  expires_at: string
} | null> {
  const supabase = createAdminClient()

  // Validate current session
  const validation = await validateSessionToken(oldSessionToken)
  if (!validation) {
    return null
  }

  // Generate new token and expiry
  const newSessionToken = generateSessionToken()
  const expiresAt = getSessionExpiry()

  // Update session
  const { data, error } = await supabase
    .from('device_sessions')
    .update({
      session_token: newSessionToken,
      expires_at: expiresAt.toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', validation.session_id)
    .select('session_token, expires_at')
    .single()

  if (error) {
    console.error('[Device Auth] Failed to refresh session:', error)
    return null
  }

  return {
    session_token: data.session_token,
    expires_at: data.expires_at,
  }
}

/**
 * Update device last_check_at (for heartbeat)
 */
export async function updateDeviceHeartbeat(
  deviceId: number,
  data?: {
    battery_level?: number
    printer_status?: string
    app_version?: string
  }
): Promise<void> {
  const supabase = createAdminClient()

  const updateData: Record<string, any> = {
    last_check_at: new Date().toISOString(),
  }

  // Could store additional heartbeat data in a separate table if needed
  // For now, just update last_check_at

  await supabase
    .from('devices')
    .update(updateData)
    .eq('id', deviceId)
}

/**
 * Get default device configuration
 */
export function getDefaultDeviceConfig(): DeviceConfig {
  return {
    poll_interval_ms: 5000, // 5 seconds
    auto_print: true,
    sound_enabled: true,
    notification_tone: 'default',
    print_customer_copy: true,
    print_kitchen_copy: true,
  }
}

/**
 * Mask email for privacy (jo***@example.com)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***'

  const [localPart, domain] = email.split('@')
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`
  }
  return `${localPart.substring(0, 2)}***@${domain}`
}

/**
 * Mask phone for privacy (showing last 4 digits)
 */
export function maskPhone(phone: string): string {
  if (!phone) return '***-***-****'

  // Remove non-digits
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '***-***-****'

  return `***-***-${digits.slice(-4)}`
}
