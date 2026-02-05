import { URLSearchParams } from 'url'

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01'

export type TwilioCallResult = {
  sid: string
  to: string
}

export type CreateTwilioCallParams = {
  to: string
  orderId: number
  baseUrl?: string
  voiceToken?: string
  statusCallbackUrl?: string
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

export function getTwilioConfig() {
  return {
    accountSid: getRequiredEnv('TWILIO_ACCOUNT_SID'),
    authToken: getRequiredEnv('TWILIO_AUTH_TOKEN'),
    fromNumber: getRequiredEnv('TWILIO_FROM_NUMBER'),
    voiceToken: process.env.TWILIO_VOICE_TOKEN || '',
    baseUrl: process.env.TWILIO_VOICE_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://menu.ca',
  }
}

export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return ''
  const trimmed = rawPhone.trim()
  if (trimmed.startsWith('+')) return trimmed

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+1${digits}`
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  return trimmed
}

export function buildTwilioVoiceUrl(orderId: number, baseUrl: string, token?: string) {
  const url = new URL('/api/twilio/voice/order-fallback', baseUrl)
  url.searchParams.set('order_id', String(orderId))
  if (token) {
    url.searchParams.set('t', token)
  }
  return url.toString()
}

export async function createTwilioCall(params: CreateTwilioCallParams): Promise<TwilioCallResult> {
  const config = getTwilioConfig()
  const to = normalizePhoneNumber(params.to)
  if (!to) {
    throw new Error('Destination phone number is missing')
  }

  const baseUrl = params.baseUrl || config.baseUrl
  const voiceToken = params.voiceToken ?? config.voiceToken
  const voiceUrl = buildTwilioVoiceUrl(params.orderId, baseUrl, voiceToken)

  const body = new URLSearchParams()
  body.set('To', to)
  body.set('From', config.fromNumber)
  body.set('Url', voiceUrl)

  if (params.statusCallbackUrl) {
    body.set('StatusCallback', params.statusCallbackUrl)
    body.set('StatusCallbackEvent', 'initiated ringing answered completed')
  }

  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')

  const response = await fetch(`${TWILIO_API_BASE}/Accounts/${config.accountSid}/Calls.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Twilio call failed (${response.status}): ${errorBody}`)
  }

  const data = await response.json() as { sid?: string }
  if (!data.sid) {
    throw new Error('Twilio call did not return a call SID')
  }

  return { sid: data.sid, to }
}
