export interface OrderItemForSpeech {
  item_name: string
  quantity: number
  unit_price: number
}

export interface OrderForSpeech {
  order_number: string
  order_type: 'delivery' | 'takeout' | 'dine_in'
  total_amount: number
  estimated_ready_time: string | null
  items: OrderItemForSpeech[]
}

export function buildOrderSpeechSummary(order: OrderForSpeech): string {
  const orderType = order.order_type === 'delivery' ? 'Delivery' : 'Pickup'
  
  const timing = order.estimated_ready_time 
    ? `for ${formatTime(order.estimated_ready_time)}`
    : 'A.S.A.P.'
  
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
  
  let itemsSummary = ''
  if (order.items.length === 0) {
    itemsSummary = 'No items.'
  } else if (order.items.length <= 3) {
    itemsSummary = order.items
      .map(item => `${item.quantity} ${item.item_name}`)
      .join(', ')
  } else {
    const firstTwo = order.items.slice(0, 2)
      .map(item => `${item.quantity} ${item.item_name}`)
      .join(', ')
    const remainingCount = order.items.length - 2
    itemsSummary = `${firstTwo}, and ${remainingCount} more ${remainingCount === 1 ? 'item' : 'items'}`
  }
  
  const total = formatCurrency(order.total_amount)
  
  return `Menu.ca order alert. Order ${formatOrderNumber(order.order_number)}. ${orderType}. ${timing}. ${itemCount} ${itemCount === 1 ? 'item' : 'items'}: ${itemsSummary}. Total ${total}. Press 1 to repeat. Press 2 to confirm received.`
}

function formatOrderNumber(orderNumber: string): string {
  return orderNumber.split('').join(' ')
}

function formatCurrency(amount: number): string {
  const dollars = Math.floor(amount)
  const cents = Math.round((amount - dollars) * 100)
  return `$${dollars} ${cents > 0 ? `and ${cents} cents` : ''}`
}

function formatTime(isoTime: string): string {
  try {
    const date = new Date(isoTime)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHour = hours % 12 || 12
    const displayMinutes = minutes > 0 ? `${minutes.toString().padStart(2, '0')}` : ''
    return displayMinutes ? `${displayHour}:${displayMinutes} ${ampm}` : `${displayHour} ${ampm}`
  } catch {
    return 'soon'
  }
}
