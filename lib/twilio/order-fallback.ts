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

export async function hasFallbackCallBeenAttempted(orderId: number): Promise<boolean> {
  const supabase = createAdminClient()
  
  const { data: order } = await supabase
    .from('orders')
    .select('id, special_instructions')
    .eq('id', orderId)
    .single() as { data: OrderMetaRow | null }
  
  if (!order || !order.special_instructions) {
    return false
  }
  
  return order.special_instructions.includes(FALLBACK_CALL_MARKER)
}

export async function markOrderAcknowledgedByPhone(orderId: number): Promise<void> {
  const supabase = createAdminClient()
  
  const timestamp = new Date().toISOString()
  const note = `${FALLBACK_CALL_MARKER} Order confirmed via phone at ${timestamp}`
  
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
  const alreadyCalled = await hasFallbackCallBeenAttempted(orderId)
  if (alreadyCalled) {
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
