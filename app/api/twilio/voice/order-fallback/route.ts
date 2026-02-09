import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildOrderFallbackMessage } from '@/lib/fallback/order-summary'
import { recordFallbackCallAttempt } from '@/lib/fallback/order-fallback'
export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'

function getVoiceToken(): string | null {
  return process.env.TWILIO_VOICE_TOKEN || null
}

function buildTwiml(message: string, orderId: number, token: string | null, repeatCount: number) {
  const safeMessage = escapeForXml(message)
  const baseUrl = process.env.TWILIO_VOICE_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://menu.ca'
  const actionUrl = new URL('/api/twilio/voice/order-fallback', baseUrl)
  actionUrl.searchParams.set('order_id', String(orderId))
  actionUrl.searchParams.set('repeat', String(repeatCount))
  if (token) {
    actionUrl.searchParams.set('t', token)
  }
  const safeActionUrl = escapeForXml(actionUrl.toString())

  // Add pause at start for natural feel
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Gather numDigits="1" action="${safeActionUrl}" method="POST" timeout="8">
    <Say voice="Polly.Joanna">${safeMessage}</Say>
    <Pause length="1"/>
    <Say voice="Polly.Joanna">Press 1 to repeat. Press 2 to confirm received.</Say>
  </Gather>
  <Say voice="Polly.Joanna">No input received. Goodbye.</Say>
</Response>`
}

function escapeForXml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function fetchOrder(orderId: number) {
  const supabase = createAdminClient() as any
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      order_type,
      order_status,
      created_at,
      total_amount,
      items,
      delivery_address,
      special_instructions,
      restaurants (
        name,
        timezone
      )
    `)
    .eq('id', orderId)
    .single()

  if (error || !order) {
    throw new Error(error?.message || 'Order not found')
  }

  return order
}

export async function GET(request: NextRequest) {
  return handleRequest(request)
}

export async function POST(request: NextRequest) {
  return handleRequest(request)
}

async function handleRequest(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('t')
    const expectedToken = getVoiceToken()

    if (expectedToken && token !== expectedToken) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const orderIdParam = searchParams.get('order_id')
    const orderId = orderIdParam ? Number(orderIdParam) : NaN
    if (!orderId || Number.isNaN(orderId)) {
      return new NextResponse('Invalid order_id', { status: 400 })
    }

    let digits: string | null = null
    if (request.method === 'POST') {
      const form = await request.formData()
      const digitsValue = form.get('Digits')
      if (typeof digitsValue === 'string') {
        digits = digitsValue
      }
    }

    const repeatCount = Number(searchParams.get('repeat') || '0')
    const order = await fetchOrder(orderId)
    
    // Detailed logging for debugging "zero items" issue
    console.log('[Twilio Voice] Order ID:', orderId)
    console.log('[Twilio Voice] Order number:', order.order_number)
    console.log('[Twilio Voice] Items type:', typeof order.items)
    console.log('[Twilio Voice] Items is array:', Array.isArray(order.items))
    console.log('[Twilio Voice] Items length:', Array.isArray(order.items) ? order.items.length : 'N/A')
    console.log('[Twilio Voice] Raw items:', JSON.stringify(order.items, null, 2))

    if (digits === '2') {
      await recordFallbackCallAttempt({
        orderId: order.id,
        orderCreatedAt: order.created_at,
        orderStatus: order.order_status,
        notes: 'Twilio fallback call confirmed by recipient (DTMF 2).',
      })

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Perfect! The order has been confirmed. Thank you!</Say>
</Response>`

      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    const { message } = buildOrderFallbackMessage(order)

    if (digits === '1' && repeatCount >= 1) {
      const safeMessage = escapeForXml(message)
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${safeMessage}</Say>
</Response>`

      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    const twiml = buildTwiml(message, orderId, expectedToken, repeatCount + 1)
    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error: any) {
    console.error('[Twilio Voice] Error:', error)
    return new NextResponse('Error generating voice response', { status: 500 })
  }
}
