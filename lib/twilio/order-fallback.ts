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

const callAttemptedOrders = new Set<number>()

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
  const note = success
    ? `Twilio fallback call attempted to ${phone}. Call SID: ${callSid}`
    : `Twilio fallback call failed to ${phone}. Error: ${error || 'Unknown'}`
  
  console.log(`[OrderFallback] Order ${orderId}: ${note}`)
  callAttemptedOrders.add(orderId)
}

export function hasFallbackCallBeenAttempted(orderId: number): boolean {
  return callAttemptedOrders.has(orderId)
}

export async function attemptFallbackCall(
  orderId: number,
  orderNumber: string,
  restaurantId: number,
  restaurantName: string
): Promise<FallbackCallResult> {
  if (hasFallbackCallBeenAttempted(orderId)) {
    return {
      orderId,
      orderNumber,
      restaurantId,
      restaurantName,
      phoneUsed: null,
      callResult: null,
      skippedReason: 'Already called for this order'
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
