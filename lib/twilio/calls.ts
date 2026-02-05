import Twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_FROM_NUMBER
const voiceBaseUrl = process.env.TWILIO_VOICE_BASE_URL

export interface CallResult {
  success: boolean
  callSid?: string
  error?: string
}

export async function makeCall(
  toNumber: string,
  orderId: number,
  orderNumber: string
): Promise<CallResult> {
  if (!accountSid || !authToken || !fromNumber || !voiceBaseUrl) {
    console.error('[Twilio] Missing Twilio configuration')
    return {
      success: false,
      error: 'Missing Twilio configuration'
    }
  }

  try {
    const client = Twilio(accountSid, authToken)
    
    const voiceToken = process.env.TWILIO_VOICE_TOKEN
    const voiceUrl = `${voiceBaseUrl}/api/twilio/voice/order-fallback?order_id=${orderId}&t=${voiceToken}`
    
    const call = await client.calls.create({
      to: toNumber,
      from: fromNumber,
      url: voiceUrl,
      method: 'POST',
    })

    console.log(`[Twilio] Call placed to ${toNumber} for order ${orderNumber}, SID: ${call.sid}`)
    
    return {
      success: true,
      callSid: call.sid
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Twilio] Failed to place call to ${toNumber}:`, errorMessage)
    return {
      success: false,
      error: errorMessage
    }
  }
}

export function formatPhoneForTwilio(phone: string): string | null {
  if (!phone) return null
  
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length === 10) {
    return `+1${cleaned}`
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`
  }
  
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return `+${cleaned}`
  }
  
  console.warn(`[Twilio] Invalid phone format: ${phone}`)
  return null
}
