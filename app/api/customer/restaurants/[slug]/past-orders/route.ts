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
    const restaurantId = extractIdFromSlug(params.slug)
    if (!restaurantId) {
      return NextResponse.json({ error: 'Invalid restaurant identifier' }, { status: 400 })
    }
    
    const supabase = await createClient() as any
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ orders: [] }, { status: 200 })
    }
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    
    if (userError || !userData) {
      return NextResponse.json({ orders: [] }, { status: 200 })
    }
    
    const userId = userData.id
    const adminSupabase = createAdminClient() as any
    
    const { data: orders, error: ordersError } = await adminSupabase
      .from('orders')
      .select('id, order_number, total_amount, order_status, created_at, order_type, items')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .in('payment_status', ['paid', 'succeeded'])
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (ordersError || !orders || orders.length === 0) {
      return NextResponse.json({ orders: [] }, { status: 200 })
    }
    
    console.log('[PastOrders] Found', orders.length, 'orders for user', userId, 'at restaurant', restaurantId)
    
    const orderIds = orders.map((order: any) => order.id)
    const { data: orderItems } = await adminSupabase
      .from('order_items')
      .select('id, order_id, dish_id, item_name, quantity, unit_price, total_price, customizations, special_instructions')
      .in('order_id', orderIds)
      .order('id', { ascending: true })
    
    const orderItemsByOrderId = new Map<number, any[]>()
    if (orderItems && orderItems.length > 0) {
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
      orders: orders.map((order: any) => {
        let items = orderItemsByOrderId.get(order.id) || []
        
        if (items.length === 0 && order.items) {
          const jsonItems = Array.isArray(order.items) ? order.items : []
          items = jsonItems.map((item: any, idx: number) => ({
            id: idx + 1,
            dish_id: item.dish_id || 0,
            item_name: item.name || item.dish_name || item.item_name || 'Item',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || item.price || 0,
            total_price: item.subtotal || item.total_price || (item.unit_price || item.price || 0) * (item.quantity || 1),
            customizations: item.modifiers || item.customizations || null,
            special_instructions: item.special_instructions || null
          }))
        }
        
        return {
          id: order.id,
          order_number: order.order_number,
          total_amount: order.total_amount,
          status: order.order_status,
          created_at: order.created_at,
          order_type: order.order_type,
          items
        }
      })
    }
    
    const itemCounts = response.orders.map((o: any) => `#${o.id}:${o.items.length}items`)
    console.log('[PastOrders] Returning', response.orders.length, 'orders -', itemCounts.join(', '))
    return NextResponse.json(response, { status: 200 })
    
  } catch (error: any) {
    console.error('[PastOrders] Unexpected error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch past orders' }, { status: 500 })
  }
}
