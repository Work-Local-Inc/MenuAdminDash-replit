export type OrderSummary = {
  message: string
  shortMessage: string
}

type OrderItem = {
  name?: string
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

function summarizeItems(items: OrderItem[]) {
  const totalCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0)
  const topItems = items.slice(0, 2).map((item) => {
    const qty = item.quantity && item.quantity > 1 ? `${item.quantity} ` : ''
    return `${qty}${item.name || 'item'}`.trim()
  })
  const remainingCount = Math.max(items.length - topItems.length, 0)

  return {
    totalCount,
    topItems,
    remainingCount,
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
  const restaurantName = order.restaurants?.name || 'Menu.ca'
  const timeZone = order.restaurants?.timezone || undefined
  const orderType = order.order_type === 'delivery' ? 'delivery' : 'pickup'
  const orderNumber = order.order_number ? `Order ${order.order_number}` : 'New order'
  const total = formatCurrency(order.total_amount)

  const { totalCount, topItems, remainingCount } = summarizeItems(items)

  const serviceTimeText = serviceTime.type === 'scheduled' && serviceTime.scheduledTime
    ? `Scheduled for ${formatScheduledTime(serviceTime.scheduledTime, timeZone)}.`
    : 'ASAP.'

  const itemsText = totalCount > 0
    ? `${totalCount} items: ${topItems.join(', ')}${remainingCount > 0 ? ` and ${remainingCount} more items.` : '.'}`
    : 'No item details available.'

  const message = `${restaurantName} order alert. ${orderNumber}. ${orderType}. ${serviceTimeText} ${itemsText} Total ${total}.`
  const shortMessage = `${orderNumber}. ${orderType}. ${serviceTimeText}`

  return { message, shortMessage }
}
