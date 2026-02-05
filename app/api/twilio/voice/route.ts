import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildOrderSpeechSummary, OrderForSpeech, OrderItemForSpeech } from '@/lib/twilio/order-summary'
import { markOrderAcknowledgedByPhone } from '@/lib/twilio/order-fallback'

const VOICE_TOKEN = process.env.TWILIO_VOICE_TOKEN
const VOICE_BASE_URL = process.env.TWILIO_VOICE_BASE_URL

interface OrderRow {
  id: number
  order_number: string
  order_type: 'delivery' | 'takeout' | 'dine_in'
  total_amount: number
  estimated_ready_time: string | null
}

interface OrderItemRow {
  item_name: string
  quantity: number
  unit_price: number
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const orderIdParam = request.nextUrl.searchParams.get('orderId')

  if (!VOICE_TOKEN || token !== VOICE_TOKEN) {
    console.log('[Twilio Voice] Unauthorized request')
    return new NextResponse(generateTwiML('Unauthorized. Goodbye.'), {
      status: 401,
      headers: { 'Content-Type': 'text/xml' }
    })
  }

  if (!orderIdParam) {
    console.log('[Twilio Voice] Missing orderId parameter')
    return new NextResponse(generateTwiML('Missing order information. Goodbye.'), {
      status: 400,
      headers: { 'Content-Type': 'text/xml' }
    })
  }

  const orderId = parseInt(orderIdParam)
  if (isNaN(orderId)) {
    console.log('[Twilio Voice] Invalid orderId parameter')
    return new NextResponse(generateTwiML('Invalid order information. Goodbye.'), {
      status: 400,
      headers: { 'Content-Type': 'text/xml' }
    })
  }

  try {
    const formData = await request.formData()
    const digits = formData.get('Digits')?.toString()

    const supabase = createAdminClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, order_type, total_amount, estimated_ready_time')
      .eq('id', orderId)
      .single() as { data: OrderRow | null; error: unknown }

    if (orderError || !order) {
      console.error('[Twilio Voice] Order not found:', orderId)
      return new NextResponse(generateTwiML('Order not found. Goodbye.'), {
        status: 404,
        headers: { 'Content-Type': 'text/xml' }
      })
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('item_name, quantity, unit_price')
      .eq('order_id', orderId) as { data: OrderItemRow[] | null }

    const orderForSpeech: OrderForSpeech = {
      order_number: order.order_number,
      order_type: order.order_type,
      total_amount: order.total_amount,
      estimated_ready_time: order.estimated_ready_time,
      items: (items || []).map((item): OrderItemForSpeech => ({
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))
    }

    if (digits === '2') {
      console.log(`[Twilio Voice] Order ${order.order_number} confirmed by phone`)
      await markOrderAcknowledgedByPhone(orderId)
      return new NextResponse(
        generateTwiML('Thank you! Order confirmed. Goodbye.'),
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const speechText = buildOrderSpeechSummary(orderForSpeech)

    return new NextResponse(
      generateGatherTwiML(speechText, orderId),
      { headers: { 'Content-Type': 'text/xml' } }
    )

  } catch (error) {
    console.error('[Twilio Voice] Unexpected error:', error)
    return new NextResponse(
      generateTwiML('An error occurred. Goodbye.'),
      { status: 500, headers: { 'Content-Type': 'text/xml' } }
    )
  }
}

function generateTwiML(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(message)}</Say>
  <Hangup/>
</Response>`
}

function generateGatherTwiML(message: string, orderId: number): string {
  const baseUrl = VOICE_BASE_URL || ''
  const actionUrl = `${baseUrl}/api/twilio/voice?orderId=${orderId}&token=${VOICE_TOKEN}`
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${escapeXml(actionUrl)}" method="POST" timeout="10">
    <Say voice="alice">${escapeXml(message)}</Say>
  </Gather>
  <Say voice="alice">No input received. Goodbye.</Say>
  <Hangup/>
</Response>`
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
