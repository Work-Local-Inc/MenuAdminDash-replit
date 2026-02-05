export type OrderSummary = {
  message: string
  shortMessage: string
}

type OrderItem = {
  name?: string
  dish_name?: string
  item_name?: string
  menu_item_name?: string
  quantity?: number
}

type ServiceTime = {
  type?: 'asap' | 'scheduled'
  scheduledTime?: string
}

function parseItems(rawItems: any): OrderItem[] {
  if (!rawItems) return []
  if (Array.isArray(rawItems)) return rawItems
  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function parseDeliveryAddress(raw: any): any {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  return raw
}

function getServiceTime(deliveryAddress: any, specialInstructions?: string | null): ServiceTime {
  const fromAddress = deliveryAddress?.service_time
  if (fromAddress?.type) return fromAddress

  if (specialInstructions) {
    const match = specialInstructions.match(/Scheduled for:\s*(.+)$/i)
    if (match?.[1]) {
      return { type: 'scheduled', scheduledTime: match[1] }
    }
  }

  return { type: 'asap' }
}

function formatScheduledTime(iso: string, timeZone?: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return formatter.format(date)
}

function formatCurrency(amount: any): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount)
  if (Number.isNaN(num)) return '$0.00'
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 2,
  }).format(num)
}

function getItemName(item: OrderItem): string {
  return item.dish_name || item.name || item.item_name || item.menu_item_name || 'item'
}

function getLastDigits(orderNumber: string, count: number = 5): string {
  const digitsOnly = orderNumber.replace(/\D/g, '')
  return digitsOnly.slice(-count)
}

function formatDigitsForSpeech(digits: string): string {
  return digits.split('').join(' ')
}

function summarizeItems(items: OrderItem[]) {
  // Build numbered list: "Item 1: Donair. Item 2: Chicken Shawarma."
  const numberedItems = items.map((item, index) => {
    const qty = item.quantity && item.quantity > 1 ? `${item.quantity} ` : ''
    const itemName = `${qty}${getItemName(item)}`.trim()
    return `Item ${index + 1}: ${itemName}`
  })

  return {
    itemCount: items.length,
    numberedItems,
  }
}

export function buildOrderFallbackMessage(order: {
  order_number?: string
  order_type?: string
  total_amount?: any
  items?: any
  delivery_address?: any
  special_instructions?: string | null
  restaurants?: { name?: string | null; timezone?: string | null }
}) {
  const items = parseItems(order.items)
  const deliveryAddress = parseDeliveryAddress(order.delivery_address)
  const serviceTime = getServiceTime(deliveryAddress, order.special_instructions)
  const restaurantName = order.restaurants?.name || 'your restaurant'
  const timeZone = order.restaurants?.timezone || undefined
  const orderType = order.order_type === 'delivery' ? 'delivery' : 'pickup'
  const total = formatCurrency(order.total_amount)
  
  // Get last 5 digits of order number for easier reading
  const orderDigits = order.order_number 
    ? formatDigitsForSpeech(getLastDigits(order.order_number, 5))
    : ''

  const { itemCount, numberedItems } = summarizeItems(items)

  const serviceTimeText = serviceTime.type === 'scheduled' && serviceTime.scheduledTime
    ? `scheduled for ${formatScheduledTime(serviceTime.scheduledTime, timeZone)}`
    : 'A S A P'

  // Build item list - each item on its own line with pauses
  // "Item 1: Donair. Item 2: Chicken Shawarma." etc.
  const itemsText = numberedItems.length > 0 
    ? numberedItems.join('. ') + '.'
    : ''

  // Friendly template with clear numbered item list
  const message = [
    `Hi! This is Menu dot C A calling for ${restaurantName}.`,
    `You have a new ${orderType} order, ${serviceTimeText}.`,
    orderDigits ? `Order ending in ${orderDigits}.` : '',
    itemsText ? `The order contains ${itemCount} items.` : '',
    itemsText,
    `Total: ${total}.`,
  ].filter(Boolean).join(' ')

  const shortMessage = `New ${orderType} order for ${restaurantName}. ${serviceTimeText}. ${total}.`

  return { message, shortMessage }
}
