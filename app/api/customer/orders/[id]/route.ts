import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    // Validate order ID
    if (!orderId || isNaN(Number(orderId))) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
    }

    // Check authentication first using regular client
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    // Use admin client to fetch order (bypasses RLS, but we validate access below)
    const supabase = createAdminClient()

    // Fetch order with restaurant details (only query existing columns)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        restaurant:restaurants(
          id,
          name
        )
      `)
      .eq('id', orderId)
      .single() as { 
        data: {
          id: number
          user_id: number | null
          is_guest_order: boolean
          guest_email: string | null
          guest_name: string | null
          restaurant_id: number
          payment_status: string
          stripe_payment_intent_id: string
          total_amount: string
          subtotal: string
          delivery_fee: string
          tax_amount: string
          items: any
          delivery_address: any
          delivery_instructions: string | null
          created_at: string
          restaurant: {
            id: number
            name: string
          }
        } | null
        error: any 
      }

    if (orderError || !order) {
      console.error('[Order API] Order not found:', orderId, orderError)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // AUTHORIZATION: Verify access rights
    if (user) {
      // Authenticated user: must own the order
      // Note: user.id is the Supabase Auth UUID, order.user_id is the numeric ID from users table
      // We need to look up the user's numeric ID from their auth_user_id
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      
      const userNumericId = userData?.id
      
      if (!userNumericId || order.user_id !== userNumericId) {
        console.error('[Order API] Access denied: User does not own order', { 
          authUserId: user.id, 
          userNumericId,
          orderUserId: order.user_id 
        })
        return NextResponse.json({ error: 'Access denied. Please check your link.' }, { status: 403 })
      }
    } else {
      // Guest user: must be guest order AND provide matching payment intent ID
      if (!order.is_guest_order) {
        console.error('[Order API] Access denied: Not a guest order')
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      
      // Require payment_intent_id as secure token (non-sequential, hard to guess)
      const { searchParams } = new URL(request.url)
      const providedToken = searchParams.get('token')
      
      if (!providedToken || providedToken !== order.stripe_payment_intent_id) {
        console.error('[Order API] Access denied: Invalid access token')
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Fetch current order status from order_status_history
    const { data: statusHistory, error: statusError } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single() as {
        data: {
          id: number
          order_id: number
          status: string
          notes: string | null
          created_at: string
        } | null
        error: any
      }

    if (statusError && statusError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[Order API] Error fetching status:', statusError)
    }

    // Parse JSON fields if they're strings
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
    
    // Convert all monetary fields from strings to numbers for UI compatibility
    const parsedItems = items.map((item: any) => ({
      ...item,
      unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
      subtotal: typeof item.subtotal === 'string' ? parseFloat(item.subtotal) : item.subtotal,
      modifiers: item.modifiers?.map((mod: any) => ({
        ...mod,
        price: typeof mod.price === 'string' ? parseFloat(mod.price) : mod.price,
      })) || []
    }))
    
    const parsedOrder = {
      ...order,
      total_amount: typeof order.total_amount === 'string' ? parseFloat(order.total_amount) : order.total_amount,
      subtotal: typeof order.subtotal === 'string' ? parseFloat(order.subtotal) : order.subtotal,
      delivery_fee: typeof order.delivery_fee === 'string' ? parseFloat(order.delivery_fee) : order.delivery_fee,
      tax_amount: typeof order.tax_amount === 'string' ? parseFloat(order.tax_amount) : order.tax_amount,
      items: parsedItems,
      delivery_address: typeof order.delivery_address === 'string' 
        ? JSON.parse(order.delivery_address) 
        : order.delivery_address,
      current_status: statusHistory?.status || 'pending',
    }

    // SECURITY: Don't expose user email or sensitive info for public access
    // Order ID itself is the secret for accessing this public endpoint
    if (parsedOrder.user_id) {
      delete parsedOrder.guest_email // Remove if exists
    }

    return NextResponse.json(parsedOrder)
  } catch (error: any) {
    console.error('[Order API] Error fetching order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
