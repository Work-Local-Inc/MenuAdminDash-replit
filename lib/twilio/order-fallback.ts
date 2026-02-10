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

const FALLBACK_CALL_MARKER = '[TWILIO_FALLBACK_CALL]'
const FALLBACK_CONFIRMED_MARKER = '[TWILIO_FALLBACK_CONFIRMED]'
const MAX_CALL_ATTEMPTS = 3
const RETRY_INTERVAL_MS = 3 * 60 * 1000 // 3 minutes between retries

export async function getRestaurantPhoneForFallback(restaurantId: number): Promise<string | null> {
  const supabase = createAdminClient() as any
  
  const { data: contacts, error: contactsError } = await supabase
    .from('restaurant_contacts')
    .select('phone')
    .eq('restaurant_id', restaurantId)
    .eq('receives_orders', true)
    .eq('is_active', true)
    .not('phone', 'is', null)
    .limit(1)
  
  if (contactsError) {
    console.error(`[OrderFallback] Error fetching contacts for restaurant ${restaurantId}:`, contactsError)
  }

  if (contacts && contacts.length > 0 && contacts[0].phone) {
    return formatPhoneForTwilio(contacts[0].phone)
  }
  
  const { data: locations, error: locationsError } = await supabase
    .from('restaurant_locations')
    .select('phone')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .not('phone', 'is', null)
    .order('is_primary', { ascending: false })
    .limit(1)
  
  if (locationsError) {
    console.error(`[OrderFallback] Error fetching locations for restaurant ${restaurantId}:`, locationsError)
  }

  if (locations && locations.length > 0 && locations[0].phone) {
    return formatPhoneForTwilio(locations[0].phone)
  }
  
  console.warn(`[OrderFallback] No phone found for restaurant ${restaurantId}`)
  return null
}

async function insertStatusHistory(
  orderId: number,
  orderCreatedAt: string,
  status: string,
  notes: string
): Promise<boolean> {
  const supabase = createAdminClient() as any

  const { error } = await supabase
    .from('order_status_history')
    .insert({
      order_id: orderId,
      order_created_at: orderCreatedAt,
      status,
      notes,
    })

  if (error) {
    console.error(`[OrderFallback] CRITICAL: Failed to insert status history for order ${orderId}:`, error)
    return false
  }
  return true
}

async function getOrderCreatedAt(orderId: number): Promise<string | null> {
  const supabase = createAdminClient() as any
  const { data, error } = await supabase
    .from('orders')
    .select('created_at')
    .eq('id', orderId)
    .single()

  if (error || !data) {
    console.error(`[OrderFallback] Failed to fetch created_at for order ${orderId}:`, error)
    return null
  }
  return data.created_at
}

export async function logFallbackCallAttempt(
  orderId: number,
  phone: string,
  callSid: string | null,
  success: boolean,
  error?: string
): Promise<boolean> {
  const timestamp = new Date().toISOString()
  const note = success
    ? `${FALLBACK_CALL_MARKER} Call placed to ${phone}. SID: ${callSid}`
    : `${FALLBACK_CALL_MARKER} Call failed to ${phone}. Error: ${error || 'Unknown'}`

  const logEntry = `[${timestamp}] ${note}`

  const orderCreatedAt = await getOrderCreatedAt(orderId)
  if (!orderCreatedAt) {
    console.error(`[OrderFallback] CRITICAL: Cannot log attempt — order ${orderId} not found`)
    return false
  }

  const historyOk = await insertStatusHistory(orderId, orderCreatedAt, 'twilio_fallback_call', logEntry)

  if (!historyOk) {
    console.error(`[OrderFallback] CRITICAL: Failed to write history row for order ${orderId}. Call tracking may be broken!`)
    return false
  }

  console.log(`[OrderFallback] Order ${orderId}: ${note} (logged to order_status_history)`)
  return true
}

export interface FallbackCallStatus {
  attemptCount: number
  isConfirmed: boolean
  lastAttemptTime: Date | null
  canRetry: boolean
}

export async function getFallbackCallStatus(orderId: number): Promise<FallbackCallStatus> {
  const supabase = createAdminClient() as any

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, acknowledged_at')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    console.error(`[OrderFallback] CRITICAL: Failed to fetch order ${orderId} for status check:`, orderError)
    return { attemptCount: 0, isConfirmed: false, lastAttemptTime: null, canRetry: false }
  }

  if (order.acknowledged_at) {
    console.log(`[OrderFallback] Order ${orderId} already acknowledged (acknowledged_at: ${order.acknowledged_at})`)
    return { attemptCount: 0, isConfirmed: true, lastAttemptTime: null, canRetry: false }
  }

  const { data: historyRows, error: historyError } = await supabase
    .from('order_status_history')
    .select('created_at, notes')
    .eq('order_id', orderId)
    .ilike('notes', `%${FALLBACK_CALL_MARKER}%`)
    .order('created_at', { ascending: true })

  if (historyError) {
    console.error(`[OrderFallback] Error fetching history for order ${orderId}:`, historyError)
  }

  let attemptCount = 0
  let lastAttemptTime: Date | null = null

  if (historyRows && historyRows.length > 0) {
    attemptCount = historyRows.length
    lastAttemptTime = new Date(historyRows[historyRows.length - 1].created_at)
    console.log(`[OrderFallback] Order ${orderId} status (from history): ${attemptCount} attempts, last at ${lastAttemptTime.toISOString()}`)
  } else {
    const { data: orderFull } = await supabase
      .from('orders')
      .select('special_instructions')
      .eq('id', orderId)
      .single()

    const instructions = orderFull?.special_instructions || ''
    const legacyMatches = instructions.match(/\[TWILIO_FALLBACK_CALL\] Call (placed|failed) to/g)
    if (legacyMatches && legacyMatches.length > 0) {
      attemptCount = legacyMatches.length
      const timestampMatches = instructions.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z)\] \[TWILIO_FALLBACK_CALL\] Call (?:placed|failed)/g)
      if (timestampMatches && timestampMatches.length > 0) {
        const lastMatch = timestampMatches[timestampMatches.length - 1]
        const dateMatch = lastMatch.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z)\]/)
        if (dateMatch) {
          lastAttemptTime = new Date(dateMatch[1])
        }
      }
      console.log(`[OrderFallback] Order ${orderId} status (legacy fallback): ${attemptCount} attempts from special_instructions`)
    } else {
      console.log(`[OrderFallback] Order ${orderId} status: 0 attempts found`)
    }
  }

  let canRetry = false
  if (attemptCount < MAX_CALL_ATTEMPTS) {
    if (!lastAttemptTime) {
      canRetry = true
    } else {
      const timeSinceLastAttempt = Date.now() - lastAttemptTime.getTime()
      canRetry = timeSinceLastAttempt >= RETRY_INTERVAL_MS
    }
  }

  return {
    attemptCount,
    isConfirmed: false,
    lastAttemptTime,
    canRetry
  }
}

export async function hasFallbackCallBeenAttempted(orderId: number): Promise<boolean> {
  const status = await getFallbackCallStatus(orderId)
  return status.isConfirmed || (status.attemptCount >= MAX_CALL_ATTEMPTS)
}

export async function markOrderAcknowledgedByPhone(orderId: number): Promise<boolean> {
  const supabase = createAdminClient() as any
  
  const timestamp = new Date().toISOString()
  
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, acknowledged_at, created_at')
    .eq('id', orderId)
    .single()
  
  if (fetchError || !order) {
    console.error(`[OrderFallback] CRITICAL: Failed to fetch order ${orderId} for acknowledgment:`, fetchError)
    return false
  }

  if (order.acknowledged_at) {
    console.log(`[OrderFallback] Order ${orderId} already acknowledged at ${order.acknowledged_at}, skipping`)
    return true
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ acknowledged_at: timestamp })
    .eq('id', orderId)

  if (updateError) {
    console.error(`[OrderFallback] CRITICAL: Failed to set acknowledged_at for order ${orderId}:`, updateError)
    return false
  }
  
  const { data: verify, error: verifyError } = await supabase
    .from('orders')
    .select('acknowledged_at')
    .eq('id', orderId)
    .single()

  if (verifyError || !verify?.acknowledged_at) {
    console.error(`[OrderFallback] CRITICAL: Verification failed - acknowledged_at NOT SET for order ${orderId} after update!`, verifyError)
    return false
  }

  const confirmNote = `[${timestamp}] ${FALLBACK_CONFIRMED_MARKER} Order confirmed via phone (pressed 2)`
  await insertStatusHistory(orderId, order.created_at, 'twilio_fallback_confirmed', confirmNote)

  console.log(`[OrderFallback] Order ${orderId} acknowledged via phone. Verified: acknowledged_at=${verify.acknowledged_at}`)
  return true
}

async function forceAcknowledgeAfterMaxCalls(orderId: number, attemptCount: number): Promise<boolean> {
  const supabase = createAdminClient() as any
  const timestamp = new Date().toISOString()

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, acknowledged_at, created_at')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    console.error(`[OrderFallback] CRITICAL: Failed to fetch order ${orderId} for force-acknowledge:`, fetchError)
    return false
  }

  if (order.acknowledged_at) {
    console.log(`[OrderFallback] Order ${orderId} already acknowledged, no force needed`)
    return true
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ acknowledged_at: timestamp })
    .eq('id', orderId)

  if (updateError) {
    console.error(`[OrderFallback] CRITICAL: Failed to force-acknowledge order ${orderId}:`, updateError)
    return false
  }

  const { data: verify, error: verifyError } = await supabase
    .from('orders')
    .select('acknowledged_at')
    .eq('id', orderId)
    .single()

  if (verifyError || !verify?.acknowledged_at) {
    console.error(`[OrderFallback] CRITICAL: Force-acknowledge verification FAILED for order ${orderId}!`, verifyError)
    return false
  }

  const maxNote = `[${timestamp}] [TWILIO_FALLBACK_MAX_REACHED] Auto-acknowledged after ${attemptCount} call attempts (max ${MAX_CALL_ATTEMPTS}). No confirmation received.`
  await insertStatusHistory(orderId, order.created_at, 'twilio_fallback_max_reached', maxNote)

  console.log(`[OrderFallback] Order ${orderId} force-acknowledged after ${attemptCount} call attempts. Verified: acknowledged_at=${verify.acknowledged_at}`)
  return true
}

export async function attemptFallbackCall(
  orderId: number,
  orderNumber: string,
  restaurantId: number,
  restaurantName: string
): Promise<FallbackCallResult> {
  const status = await getFallbackCallStatus(orderId)
  
  console.log(`[OrderFallback] attemptFallbackCall for order ${orderNumber}: attemptCount=${status.attemptCount}, isConfirmed=${status.isConfirmed}, canRetry=${status.canRetry}, lastAttemptTime=${status.lastAttemptTime}`)

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
  
  if (status.attemptCount >= MAX_CALL_ATTEMPTS) {
    console.log(`[OrderFallback] Order ${orderNumber}: Max attempts (${MAX_CALL_ATTEMPTS}) reached. Force-acknowledging...`)
    const forceResult = await forceAcknowledgeAfterMaxCalls(orderId, status.attemptCount)
    return {
      orderId,
      orderNumber,
      restaurantId,
      restaurantName,
      phoneUsed: null,
      callResult: null,
      skippedReason: forceResult 
        ? `Max attempts reached (${MAX_CALL_ATTEMPTS} calls). Order auto-acknowledged to stop calls.`
        : `Max attempts reached (${MAX_CALL_ATTEMPTS} calls). WARNING: Force-acknowledge FAILED - order may receive more calls!`
    }
  }
  
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
  
  console.log(`[OrderFallback] Placing call attempt ${status.attemptCount + 1}/${MAX_CALL_ATTEMPTS} for order ${orderNumber} to ${phone}`)
  
  const callResult = await makeCall(phone, orderId, orderNumber)
  
  const logged = await logFallbackCallAttempt(orderId, phone, callResult.callSid || null, callResult.success, callResult.error)
  
  if (!logged) {
    console.error(`[OrderFallback] CRITICAL: Failed to log call attempt for order ${orderNumber}. Call tracking may be broken!`)
  }
  
  return {
    orderId,
    orderNumber,
    restaurantId,
    restaurantName,
    phoneUsed: phone,
    callResult
  }
}
