import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractIdFromSlug } from '@/lib/utils/slugify'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    console.log('[PastOrders] Request received for slug:', params.slug)
    
    // Get restaurant ID from slug
    const restaurantId = extractIdFromSlug(params.slug)
    if (!restaurantId) {
      console.error('[PastOrders] Invalid restaurant slug:', params.slug)
      return NextResponse.json(
        { error: 'Invalid restaurant identifier' },
        { status: 400 }
      )
    }
    
    console.log('[PastOrders] Restaurant ID:', restaurantId)
    
    // Get current auth user
    const supabase = await createClient() as any
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.log('[PastOrders] Auth error (treating as guest):', authError.message)
      return NextResponse.json({ orders: [] }, { status: 200 })
    }
    
    if (!user) {
      console.log('[PastOrders] No auth user - guest mode')
      return NextResponse.json({ orders: [] }, { status: 200 })
    }
    
    console.log('[PastOrders] Auth user found:', user.id)
    
    // Get user record from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    
    if (userError) {
      console.error('[PastOrders] User lookup error:', userError.message)
      return NextResponse.json({ orders: [] }, { status: 200 })
    }
    
    if (!userData) {
      console.log('[PastOrders] No user record found for auth user')
      return NextResponse.json({ orders: [] }, { status: 200 })
    }
    
    const userId = userData.id
    console.log('[PastOrders] User ID:', userId)
    
    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient() as any
    
    // Get orders for this user at this restaurant, paid only, limit 5, ordered by date descending
    const { data: orders, error: ordersError } = await adminSupabase
      .from('orders')
      .select('id, order_number, total_amount, order_status, created_at, order_type')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .in('payment_status', ['paid', 'succeeded'])
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (ordersError) {
      console.error('[PastOrders] Orders query error:', ordersError.message)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }
    
    if (!orders || orders.length === 0) {
      console.log('[PastOrders] No orders found for user', userId, 'at restaurant', restaurantId)
      return NextResponse.json({ orders: [] }, { status: 200 })
    }
    
    console.log('[PastOrders] Found', orders.length, 'orders')
    
    // Fetch order items for all orders
    const orderIds = orders.map((order: any) => order.id)
    const { data: orderItems, error: orderItemsError } = await adminSupabase
      .from('order_items')
      .select('id, order_id, dish_id, item_name, quantity, unit_price, total_price, customizations, special_instructions')
      .in('order_id', orderIds)
    
    if (orderItemsError) {
      console.error('[PastOrders] Order items query error:', orderItemsError.message)
      return NextResponse.json(
        { error: 'Failed to fetch order items' },
        { status: 500 }
      )
    }
    
    // Build response with order items mapped to each order
    const orderItemsByOrderId = new Map<number, any[]>()
    if (orderItems) {
      orderItems.forEach((item: any) => {
        if (!orderItemsByOrderId.has(item.order_id)) {
          orderItemsByOrderId.set(item.order_id, [])
        }
        orderItemsByOrderId.get(item.order_id)!.push({
          id: item.id,
          dish_id: item.dish_id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          customizations: item.customizations,
          special_instructions: item.special_instructions
        })
      })
    }
    
    const response = {
      orders: orders.map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        status: order.order_status,
        created_at: order.created_at,
        order_type: order.order_type,
        items: orderItemsByOrderId.get(order.id) || []
      }))
    }
    
    console.log('[PastOrders] Returning', response.orders.length, 'orders')
    return NextResponse.json(response, { status: 200 })
    
  } catch (error: any) {
    console.error('[PastOrders] Unexpected error:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch past orders' },
      { status: 500 }
    )
  }
}
