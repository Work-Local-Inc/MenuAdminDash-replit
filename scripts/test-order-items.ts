import { createAdminClient } from '../lib/supabase/admin'
import { buildOrderFallbackMessage } from '../lib/fallback/order-summary'

async function testOrderItems(orderId: number) {
  console.log('\n=== Testing Order Items Fetch ===')
  console.log('Order ID:', orderId)
  
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

  if (error) {
    console.error('Error fetching order:', error)
    return
  }

  console.log('\n--- Raw Order Data ---')
  console.log('Order Number:', order.order_number)
  console.log('Restaurant:', order.restaurants?.name)
  console.log('Items type:', typeof order.items)
  console.log('Items is array:', Array.isArray(order.items))
  console.log('Items length:', Array.isArray(order.items) ? order.items.length : 'N/A')
  console.log('Raw items:', JSON.stringify(order.items, null, 2))

  console.log('\n--- Building Message ---')
  const result = buildOrderFallbackMessage(order)
  console.log('\nFinal message:', result.message)
  console.log('Short message:', result.shortMessage)
}

const orderId = parseInt(process.argv[2] || '0')
if (!orderId) {
  console.log('Usage: npx ts-node scripts/test-order-items.ts <order_id>')
  console.log('\nTo find order ID, ask Supabase agent:')
  console.log('SELECT id, order_number FROM menuca_v3.orders WHERE restaurant_id = 1021 ORDER BY created_at DESC LIMIT 5;')
  process.exit(1)
}

testOrderItems(orderId)
