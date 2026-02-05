import { createAdminClient } from '@/lib/supabase/admin'
import { makeCall, formatPhoneForTwilio, CallResult } from './calls'

export interface FallbackCallResult {
  orderId: number
  orderNumber: string
  restaurantId: number
  restaurantName: string
  phoneUsed: string | null
  callResult: CallResult | null
  skippedReason?: string
}

interface ContactRow {
  phone: string | null
}

interface LocationRow {
  phone: string | null
}

interface OrderMetaRow {
  id: number
  special_instructions: string | null
}

const FALLBACK_CALL_MARKER = '[TWILIO_FALLBACK_CALL]'
const FALLBACK_CONFIRMED_MARKER = '[TWILIO_FALLBACK_CONFIRMED]'
const MAX_CALL_ATTEMPTS = 1 // Temporarily disabled retry until AMD is implemented
const RETRY_INTERVAL_MS = 3 * 60 * 1000 // 3 minutes between retries

export async function getRestaurantPhoneForFallback(restaurantId: number): Promise<string | null> {
  const supabase = createAdminClient()
  
  const { data: contacts } = await supabase
    .from('restaurant_contacts')
    .select('phone')
    .eq('restaurant_id', restaurantId)
    .eq('receives_orders', true)
    .eq('is_active', true)
    .not('phone', 'is', null)
    .limit(1) as { data: ContactRow[] | null }
  
  if (contacts && contacts.length > 0 && contacts[0].phone) {
    return formatPhoneForTwilio(contacts[0].phone)
  }
  
  const { data: locations } = await supabase
    .from('restaurant_locations')
    .select('phone')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .not('phone', 'is', null)
    .order('is_primary', { ascending: false })
    .limit(1) as { data: LocationRow[] | null }
  
  if (locations && locations.length > 0 && locations[0].phone) {
    return formatPhoneForTwilio(locations[0].phone)
  }
  
  console.warn(`[OrderFallback] No phone found for restaurant ${restaurantId}`)
  return null
}

export async function logFallbackCallAttempt(
  orderId: number,
  phone: string,
  callSid: string | null,
  success: boolean,
  error?: string
): Promise<void> {
  const supabase = createAdminClient()
  
  const note = success
    ? `${FALLBACK_CALL_MARKER} Call placed to ${phone}. SID: ${callSid}`
    : `${FALLBACK_CALL_MARKER} Call failed to ${phone}. Error: ${error || 'Unknown'}`
  
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] ${note}`
  
  const { data: order } = await supabase
    .from('orders')
    .select('id, special_instructions')
    .eq('id', orderId)
    .single() as { data: OrderMetaRow | null }
  
  if (order) {
    const existingInstructions = order.special_instructions || ''
    const newInstructions = existingInstructions 
      ? `${existingInstructions}\n---\n${logEntry}`
      : `---\n${logEntry}`
    
    await (supabase
      .from('orders')
      .update({ special_instructions: newInstructions } as never)
      .eq('id', orderId))
  }
  
  console.log(`[OrderFallback] Order ${orderId}: ${note}`)
}

export interface FallbackCallStatus {
  attemptCount: number
  isConfirmed: boolean
  lastAttemptTime: Date | null
  canRetry: boolean
}

export async function getFallbackCallStatus(orderId: number): Promise<FallbackCallStatus> {
  const supabase = createAdminClient()
  
  const { data: order } = await supabase
    .from('orders')
    .select('id, special_instructions, acknowledged_at')
    .eq('id', orderId)
    .single() as { data: (OrderMetaRow & { acknowledged_at: string | null }) | null }
  
  if (!order || !order.special_instructions) {
    return { attemptCount: 0, isConfirmed: false, lastAttemptTime: null, canRetry: true }
  }
  
  // Check if confirmed via phone (press 2)
  const isConfirmed = order.special_instructions.includes(FALLBACK_CONFIRMED_MARKER) || !!order.acknowledged_at
  
  // Count call attempts (each "Call placed to" line is an attempt)
  const callAttempts = (order.special_instructions.match(/\[TWILIO_FALLBACK_CALL\] Call placed to/g) || []).length
  
  // Find the last attempt timestamp
  let lastAttemptTime: Date | null = null
  const timestampMatches = order.special_instructions.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z)\] \[TWILIO_FALLBACK_CALL\] Call placed/g)
  if (timestampMatches && timestampMatches.length > 0) {
    const lastMatch = timestampMatches[timestampMatches.length - 1]
    const dateMatch = lastMatch.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z)\]/)
    if (dateMatch) {
      lastAttemptTime = new Date(dateMatch[1])
    }
  }
  
  // Determine if we can retry
  let canRetry = false
  if (!isConfirmed && callAttempts < MAX_CALL_ATTEMPTS) {
    if (!lastAttemptTime) {
      canRetry = true
    } else {
      const timeSinceLastAttempt = Date.now() - lastAttemptTime.getTime()
      canRetry = timeSinceLastAttempt >= RETRY_INTERVAL_MS
    }
  }
  
  return {
    attemptCount: callAttempts,
    isConfirmed,
    lastAttemptTime,
    canRetry
  }
}

// Keep backward compatibility
export async function hasFallbackCallBeenAttempted(orderId: number): Promise<boolean> {
  const status = await getFallbackCallStatus(orderId)
  // Only consider "fully attempted" if confirmed OR max attempts reached
  return status.isConfirmed || (status.attemptCount >= MAX_CALL_ATTEMPTS)
}

export async function markOrderAcknowledgedByPhone(orderId: number): Promise<void> {
  const supabase = createAdminClient()
  
  const timestamp = new Date().toISOString()
  // Use CONFIRMED marker so retry logic knows to stop
  const note = `[${timestamp}] ${FALLBACK_CONFIRMED_MARKER} Order confirmed via phone (pressed 2)`
  
  const { data: order } = await supabase
    .from('orders')
    .select('id, special_instructions, acknowledged_at')
    .eq('id', orderId)
    .single() as { data: (OrderMetaRow & { acknowledged_at: string | null }) | null }
  
  if (order && !order.acknowledged_at) {
    const existingInstructions = order.special_instructions || ''
    const newInstructions = existingInstructions 
      ? `${existingInstructions}\n${note}`
      : note
    
    await (supabase
      .from('orders')
      .update({ 
        acknowledged_at: timestamp,
        special_instructions: newInstructions 
      } as never)
      .eq('id', orderId))
    
    console.log(`[OrderFallback] Order ${orderId} acknowledged via phone`)
  }
}

export async function attemptFallbackCall(
  orderId: number,
  orderNumber: string,
  restaurantId: number,
  restaurantName: string
): Promise<FallbackCallResult> {
  const status = await getFallbackCallStatus(orderId)
  
  // Already confirmed via phone - no more calls needed
  if (status.isConfirmed) {
    return {
      orderId,
      orderNumber,
      restaurantId,
      restaurantName,
      phoneUsed: null,
      callResult: null,
      skippedReason: 'Order already confirmed via phone'
    }
  }
  
  // Max attempts reached (3 calls)
  if (status.attemptCount >= MAX_CALL_ATTEMPTS) {
    return {
      orderId,
      orderNumber,
      restaurantId,
      restaurantName,
      phoneUsed: null,
      callResult: null,
      skippedReason: `Max attempts reached (${MAX_CALL_ATTEMPTS} calls made)`
    }
  }
  
  // Need to wait before retrying (3 min between calls)
  if (!status.canRetry && status.lastAttemptTime) {
    const waitTimeMs = RETRY_INTERVAL_MS - (Date.now() - status.lastAttemptTime.getTime())
    const waitTimeSec = Math.ceil(waitTimeMs / 1000)
    return {
      orderId,
      orderNumber,
      restaurantId,
      restaurantName,
      phoneUsed: null,
      callResult: null,
      skippedReason: `Waiting ${waitTimeSec}s before retry attempt ${status.attemptCount + 1}/${MAX_CALL_ATTEMPTS}`
    }
  }
  
  const phone = await getRestaurantPhoneForFallback(restaurantId)
  if (!phone) {
    return {
      orderId,
      orderNumber,
      restaurantId,
      restaurantName,
      phoneUsed: null,
      callResult: null,
      skippedReason: 'No phone number available'
    }
  }
  
  console.log(`[OrderFallback] Placing call attempt ${status.attemptCount + 1}/${MAX_CALL_ATTEMPTS} for order ${orderNumber}`)
  
  const callResult = await makeCall(phone, orderId, orderNumber)
  
  await logFallbackCallAttempt(orderId, phone, callResult.callSid || null, callResult.success, callResult.error)
  
  return {
    orderId,
    orderNumber,
    restaurantId,
    restaurantName,
    phoneUsed: phone,
    callResult
  }
}
