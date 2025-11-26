import type { PrintReceiptData, TabletOrder } from '@/types/tablet'

/**
 * ESC/POS Commands for thermal printers
 */
export const ESC = {
  // Initialize printer
  INIT: '\x1B\x40',

  // Text alignment
  ALIGN_LEFT: '\x1B\x61\x00',
  ALIGN_CENTER: '\x1B\x61\x01',
  ALIGN_RIGHT: '\x1B\x61\x02',

  // Text size
  NORMAL: '\x1B\x21\x00',
  DOUBLE_HEIGHT: '\x1B\x21\x10',
  DOUBLE_WIDTH: '\x1B\x21\x20',
  DOUBLE_SIZE: '\x1B\x21\x30',

  // Text style
  BOLD_ON: '\x1B\x45\x01',
  BOLD_OFF: '\x1B\x45\x00',
  UNDERLINE_ON: '\x1B\x2D\x01',
  UNDERLINE_OFF: '\x1B\x2D\x00',

  // Feed and cut
  LINE_FEED: '\x0A',
  CUT_PAPER: '\x1D\x56\x00', // Full cut
  CUT_PARTIAL: '\x1D\x56\x01', // Partial cut

  // Cash drawer
  OPEN_DRAWER: '\x1B\x70\x00\x19\xFA',
}

/**
 * Receipt formatting constants
 */
const RECEIPT_WIDTH = 48 // Characters for 80mm thermal paper
const DIVIDER = '='.repeat(RECEIPT_WIDTH)
const LINE = '-'.repeat(RECEIPT_WIDTH)

/**
 * Format price as currency string
 */
function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`
}

/**
 * Pad a line to align left and right text
 */
function padLine(left: string, right: string, width: number = RECEIPT_WIDTH): string {
  const padding = width - left.length - right.length
  if (padding <= 0) {
    return `${left.substring(0, width - right.length - 1)} ${right}`
  }
  return `${left}${' '.repeat(padding)}${right}`
}

/**
 * Center text within receipt width
 */
function centerText(text: string, width: number = RECEIPT_WIDTH): string {
  if (text.length >= width) return text.substring(0, width)
  const padding = Math.floor((width - text.length) / 2)
  return ' '.repeat(padding) + text
}

/**
 * Word wrap text to fit receipt width
 */
function wrapText(text: string, width: number = RECEIPT_WIDTH, indent: number = 0): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ' '.repeat(indent)

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine.trim() ? ' ' : '') + word
    } else {
      if (currentLine.trim()) lines.push(currentLine)
      currentLine = ' '.repeat(indent) + word
    }
  }

  if (currentLine.trim()) lines.push(currentLine)
  return lines
}

/**
 * Transform TabletOrder to PrintReceiptData
 */
export function orderToPrintData(
  order: TabletOrder,
  restaurantName: string,
  restaurantPhone?: string,
  restaurantAddress?: string
): PrintReceiptData {
  return {
    restaurant_name: restaurantName,
    restaurant_phone: restaurantPhone,
    restaurant_address: restaurantAddress,

    order_number: order.order_number,
    order_type: order.order_type.toUpperCase() as 'DELIVERY' | 'PICKUP',
    order_time: new Date(order.created_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),

    customer_name: order.customer.name,
    customer_phone: order.customer.phone,

    delivery_address: order.delivery_address ? {
      street: order.delivery_address.street,
      city: order.delivery_address.city,
      postal_code: order.delivery_address.postal_code,
      instructions: order.delivery_address.instructions,
    } : undefined,

    items: order.items.map(item => ({
      quantity: item.quantity,
      name: item.name,
      size: item.size !== 'default' ? item.size : undefined,
      modifiers: item.modifiers.map(m => m.name),
      price: item.subtotal,
      special_instructions: item.special_instructions,
    })),

    subtotal: order.subtotal,
    delivery_fee: order.delivery_fee,
    tax: order.tax_amount,
    tip: order.tip_amount > 0 ? order.tip_amount : undefined,
    total: order.total_amount,

    estimated_time: order.service_time.type === 'scheduled' && order.service_time.scheduledTime
      ? new Date(order.service_time.scheduledTime).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : undefined,
    payment_status: order.payment_status === 'paid' ? 'PAID' : order.payment_status.toUpperCase(),
  }
}

/**
 * Generate plain text receipt (for preview or simple printers)
 */
export function generateTextReceipt(data: PrintReceiptData): string {
  const lines: string[] = []

  // Header
  lines.push(DIVIDER)
  lines.push(centerText(data.restaurant_name.toUpperCase()))
  lines.push(DIVIDER)

  // Order info
  lines.push(`Order #: ${data.order_number}`)
  lines.push(`Type: ${data.order_type}`)
  lines.push(`Time: ${data.order_time}`)
  lines.push(LINE)

  // Customer info
  lines.push('')
  lines.push(`CUSTOMER: ${data.customer_name}`)
  lines.push(`PHONE: ${data.customer_phone}`)

  // Delivery address (if applicable)
  if (data.delivery_address) {
    lines.push('')
    lines.push('DELIVER TO:')
    lines.push(data.delivery_address.street)
    lines.push(`${data.delivery_address.city}, ${data.delivery_address.postal_code}`)
    if (data.delivery_address.instructions) {
      lines.push(`Instructions: ${data.delivery_address.instructions}`)
    }
  }

  // Items
  lines.push('')
  lines.push(DIVIDER)
  lines.push(centerText('ORDER ITEMS'))
  lines.push(DIVIDER)
  lines.push('')

  for (const item of data.items) {
    // Item line: quantity, name, price
    const itemLine = `${item.quantity}x  ${item.name}`
    lines.push(padLine(itemLine, formatPrice(item.price)))

    // Size (if not default)
    if (item.size) {
      lines.push(`    Size: ${item.size}`)
    }

    // Modifiers
    for (const modifier of item.modifiers) {
      lines.push(`    - ${modifier}`)
    }

    // Special instructions
    if (item.special_instructions) {
      lines.push(`    ** ${item.special_instructions} **`)
    }

    lines.push('')
  }

  // Totals
  lines.push(LINE)
  lines.push(padLine('Subtotal:', formatPrice(data.subtotal)))

  if (data.delivery_fee > 0) {
    lines.push(padLine('Delivery Fee:', formatPrice(data.delivery_fee)))
  }

  lines.push(padLine('Tax:', formatPrice(data.tax)))

  if (data.tip && data.tip > 0) {
    lines.push(padLine('Tip:', formatPrice(data.tip)))
  }

  lines.push(DIVIDER)
  lines.push(padLine('TOTAL:', formatPrice(data.total)))
  lines.push(DIVIDER)

  // Payment status
  lines.push(`${data.payment_status}`)

  // Estimated time
  if (data.estimated_time) {
    lines.push('')
    lines.push(`Scheduled: ${data.estimated_time}`)
  }

  // Footer
  lines.push('')
  lines.push(DIVIDER)
  lines.push(centerText('THANK YOU!'))
  lines.push(DIVIDER)
  lines.push('')
  lines.push('')
  lines.push('')

  return lines.join('\n')
}

/**
 * Generate ESC/POS formatted receipt for thermal printers
 */
export function generateEscPosReceipt(data: PrintReceiptData): string {
  let receipt = ''

  // Initialize printer
  receipt += ESC.INIT

  // Header - Restaurant name (large, centered)
  receipt += ESC.ALIGN_CENTER
  receipt += ESC.DOUBLE_SIZE
  receipt += ESC.BOLD_ON
  receipt += data.restaurant_name.toUpperCase() + ESC.LINE_FEED
  receipt += ESC.BOLD_OFF
  receipt += ESC.NORMAL

  // Order type banner
  receipt += ESC.DOUBLE_HEIGHT
  receipt += `*** ${data.order_type} ***` + ESC.LINE_FEED
  receipt += ESC.NORMAL

  // Order info
  receipt += ESC.ALIGN_LEFT
  receipt += `Order #: ${data.order_number}` + ESC.LINE_FEED
  receipt += `Time: ${data.order_time}` + ESC.LINE_FEED
  receipt += LINE + ESC.LINE_FEED

  // Customer
  receipt += ESC.BOLD_ON
  receipt += `Customer: ${data.customer_name}` + ESC.LINE_FEED
  receipt += ESC.BOLD_OFF
  receipt += `Phone: ${data.customer_phone}` + ESC.LINE_FEED

  // Delivery address
  if (data.delivery_address) {
    receipt += ESC.LINE_FEED
    receipt += ESC.BOLD_ON
    receipt += 'DELIVER TO:' + ESC.LINE_FEED
    receipt += ESC.BOLD_OFF
    receipt += data.delivery_address.street + ESC.LINE_FEED
    receipt += `${data.delivery_address.city}, ${data.delivery_address.postal_code}` + ESC.LINE_FEED
    if (data.delivery_address.instructions) {
      receipt += ESC.LINE_FEED
      receipt += 'Instructions:' + ESC.LINE_FEED
      receipt += data.delivery_address.instructions + ESC.LINE_FEED
    }
  }

  // Items header
  receipt += ESC.LINE_FEED
  receipt += DIVIDER + ESC.LINE_FEED
  receipt += ESC.ALIGN_CENTER
  receipt += ESC.BOLD_ON
  receipt += 'ORDER ITEMS' + ESC.LINE_FEED
  receipt += ESC.BOLD_OFF
  receipt += ESC.ALIGN_LEFT
  receipt += DIVIDER + ESC.LINE_FEED

  // Items
  for (const item of data.items) {
    receipt += ESC.LINE_FEED
    receipt += ESC.BOLD_ON
    receipt += `${item.quantity}x ${item.name}` + ESC.LINE_FEED
    receipt += ESC.BOLD_OFF

    if (item.size) {
      receipt += `   Size: ${item.size}` + ESC.LINE_FEED
    }

    for (const modifier of item.modifiers) {
      receipt += `   + ${modifier}` + ESC.LINE_FEED
    }

    if (item.special_instructions) {
      receipt += ESC.BOLD_ON
      receipt += `   ** ${item.special_instructions} **` + ESC.LINE_FEED
      receipt += ESC.BOLD_OFF
    }

    receipt += ESC.ALIGN_RIGHT
    receipt += formatPrice(item.price) + ESC.LINE_FEED
    receipt += ESC.ALIGN_LEFT
  }

  // Totals
  receipt += ESC.LINE_FEED
  receipt += LINE + ESC.LINE_FEED

  receipt += padLine('Subtotal:', formatPrice(data.subtotal)) + ESC.LINE_FEED

  if (data.delivery_fee > 0) {
    receipt += padLine('Delivery:', formatPrice(data.delivery_fee)) + ESC.LINE_FEED
  }

  receipt += padLine('Tax:', formatPrice(data.tax)) + ESC.LINE_FEED

  if (data.tip && data.tip > 0) {
    receipt += padLine('Tip:', formatPrice(data.tip)) + ESC.LINE_FEED
  }

  receipt += DIVIDER + ESC.LINE_FEED
  receipt += ESC.DOUBLE_SIZE
  receipt += ESC.BOLD_ON
  receipt += padLine('TOTAL:', formatPrice(data.total)) + ESC.LINE_FEED
  receipt += ESC.BOLD_OFF
  receipt += ESC.NORMAL
  receipt += DIVIDER + ESC.LINE_FEED

  // Payment status
  receipt += ESC.ALIGN_CENTER
  receipt += ESC.DOUBLE_HEIGHT
  receipt += data.payment_status + ESC.LINE_FEED
  receipt += ESC.NORMAL

  // Scheduled time
  if (data.estimated_time) {
    receipt += ESC.LINE_FEED
    receipt += `Scheduled: ${data.estimated_time}` + ESC.LINE_FEED
  }

  // Footer
  receipt += ESC.LINE_FEED
  receipt += DIVIDER + ESC.LINE_FEED
  receipt += ESC.BOLD_ON
  receipt += 'THANK YOU!' + ESC.LINE_FEED
  receipt += ESC.BOLD_OFF
  receipt += DIVIDER + ESC.LINE_FEED

  // Feed and cut
  receipt += ESC.LINE_FEED
  receipt += ESC.LINE_FEED
  receipt += ESC.LINE_FEED
  receipt += ESC.CUT_PARTIAL

  return receipt
}

/**
 * Generate kitchen ticket (simplified for kitchen display)
 */
export function generateKitchenTicket(data: PrintReceiptData): string {
  let ticket = ''

  ticket += ESC.INIT
  ticket += ESC.ALIGN_CENTER

  // Order type and number (large)
  ticket += ESC.DOUBLE_SIZE
  ticket += ESC.BOLD_ON
  ticket += `${data.order_type}` + ESC.LINE_FEED
  ticket += `#${data.order_number.split('-').pop()}` + ESC.LINE_FEED // Just the short part
  ticket += ESC.BOLD_OFF
  ticket += ESC.NORMAL

  ticket += `${data.order_time}` + ESC.LINE_FEED
  ticket += DIVIDER + ESC.LINE_FEED

  ticket += ESC.ALIGN_LEFT

  // Items only (larger text for kitchen visibility)
  for (const item of data.items) {
    ticket += ESC.DOUBLE_HEIGHT
    ticket += ESC.BOLD_ON
    ticket += `${item.quantity}x ${item.name}` + ESC.LINE_FEED
    ticket += ESC.BOLD_OFF
    ticket += ESC.NORMAL

    if (item.size) {
      ticket += `   ${item.size}` + ESC.LINE_FEED
    }

    for (const modifier of item.modifiers) {
      ticket += `   + ${modifier}` + ESC.LINE_FEED
    }

    if (item.special_instructions) {
      ticket += ESC.BOLD_ON
      ticket += `   *** ${item.special_instructions} ***` + ESC.LINE_FEED
      ticket += ESC.BOLD_OFF
    }

    ticket += ESC.LINE_FEED
  }

  ticket += DIVIDER + ESC.LINE_FEED

  // Customer name for calling
  ticket += ESC.ALIGN_CENTER
  ticket += ESC.DOUBLE_HEIGHT
  ticket += ESC.BOLD_ON
  ticket += data.customer_name + ESC.LINE_FEED
  ticket += ESC.BOLD_OFF
  ticket += ESC.NORMAL

  // Feed and cut
  ticket += ESC.LINE_FEED
  ticket += ESC.LINE_FEED
  ticket += ESC.CUT_PARTIAL

  return ticket
}
