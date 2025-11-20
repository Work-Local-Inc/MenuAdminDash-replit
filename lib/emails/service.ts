import { resend } from './client'
import OrderConfirmationEmail from './templates/order-confirmation'
import WelcomeEmail from './templates/welcome'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

interface OrderItem {
  dish_id: number
  name: string
  size: string
  quantity: number
  unit_price: number
  subtotal: number
  modifiers?: Array<{
    id: number
    name: string
    price: number
  }>
}

interface DeliveryAddress {
  street: string
  city: string
  province: string
  postal_code: string
  delivery_instructions?: string
}

interface OrderConfirmationData {
  orderNumber: string
  restaurantName: string
  restaurantLogoUrl?: string
  items: OrderItem[]
  deliveryAddress: DeliveryAddress
  subtotal: number
  deliveryFee: number
  tax: number
  taxLabel?: string
  total: number
  estimatedDeliveryTime?: string
  customerEmail: string
}

interface WelcomeEmailData {
  firstName: string
  email: string
}

type EmailError = {
  type: 'configuration' | 'validation' | 'rate_limit' | 'network' | 'unknown'
  message: string
  retryable: boolean
  originalError?: any
}

function categorizeError(error: any): EmailError {
  const errorMessage = error?.message || String(error)
  
  if (!process.env.RESEND_API_KEY) {
    return {
      type: 'configuration',
      message: 'RESEND_API_KEY not configured',
      retryable: false,
      originalError: error,
    }
  }

  if (errorMessage.includes('Invalid email') || errorMessage.includes('validation')) {
    return {
      type: 'validation',
      message: `Email validation error: ${errorMessage}`,
      retryable: false,
      originalError: error,
    }
  }

  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return {
      type: 'rate_limit',
      message: 'Rate limit exceeded',
      retryable: true,
      originalError: error,
    }
  }

  if (
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('network') ||
    errorMessage.includes('fetch failed')
  ) {
    return {
      type: 'network',
      message: `Network error: ${errorMessage}`,
      retryable: true,
      originalError: error,
    }
  }

  return {
    type: 'unknown',
    message: errorMessage,
    retryable: true,
    originalError: error,
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function sendEmailWithRetry<T>(
  emailFn: () => Promise<T>,
  context: string,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let lastError: EmailError | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await emailFn()
      
      if (attempt > 1) {
        console.log(`[Email Service] ${context} succeeded on attempt ${attempt}/${maxRetries}`)
      }
      
      return result
    } catch (error) {
      lastError = categorizeError(error)
      
      const isLastAttempt = attempt === maxRetries
      const shouldRetry = lastError.retryable && !isLastAttempt
      
      console.error(`[Email Service] ${context} failed (attempt ${attempt}/${maxRetries}):`, {
        errorType: lastError.type,
        message: lastError.message,
        retryable: lastError.retryable,
        willRetry: shouldRetry,
      })
      
      if (!shouldRetry) {
        break
      }
      
      const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      console.log(`[Email Service] Retrying ${context} in ${delayMs}ms...`)
      await delay(delayMs)
    }
  }
  
  throw new Error(
    `Failed to send email after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
  )
}

function generateOrderConfirmationPlainText(data: OrderConfirmationData): string {
  const lines: string[] = []
  
  lines.push('========================================')
  lines.push('         MENU.CA ORDER CONFIRMATION')
  lines.push('========================================')
  lines.push('')
  lines.push('✓ ORDER CONFIRMED!')
  lines.push('')
  lines.push(`Thank you for your order from ${data.restaurantName}`)
  lines.push('')
  lines.push('----------------------------------------')
  lines.push('ORDER DETAILS')
  lines.push('----------------------------------------')
  lines.push(`Order Number: #${data.orderNumber}`)
  lines.push(`Estimated Delivery: ${data.estimatedDeliveryTime || '45-60 minutes'}`)
  lines.push('')
  lines.push('----------------------------------------')
  lines.push('ITEMS ORDERED')
  lines.push('----------------------------------------')
  
  data.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.quantity}x ${item.name} (${item.size})`)
    if (item.modifiers && item.modifiers.length > 0) {
      lines.push(`   + ${item.modifiers.map(m => m.name).join(', ')}`)
    }
    lines.push(`   $${item.subtotal.toFixed(2)}`)
    lines.push('')
  })
  
  lines.push('----------------------------------------')
  lines.push('PRICE BREAKDOWN')
  lines.push('----------------------------------------')
  lines.push(`Subtotal:        $${data.subtotal.toFixed(2)}`)
  lines.push(`Delivery Fee:    $${data.deliveryFee.toFixed(2)}`)
  lines.push(`${data.taxLabel || 'Tax'}:   $${data.tax.toFixed(2)}`)
  lines.push('----------------------------------------')
  lines.push(`TOTAL PAID:      $${data.total.toFixed(2)}`)
  lines.push('')
  lines.push('----------------------------------------')
  lines.push('DELIVERY ADDRESS')
  lines.push('----------------------------------------')
  lines.push(data.deliveryAddress.street)
  lines.push(`${data.deliveryAddress.city}, ${data.deliveryAddress.province} ${data.deliveryAddress.postal_code}`)
  
  if (data.deliveryAddress.delivery_instructions) {
    lines.push('')
    lines.push('Delivery Instructions:')
    lines.push(data.deliveryAddress.delivery_instructions)
  }
  
  lines.push('')
  lines.push('========================================')
  lines.push('Need help with your order?')
  lines.push('Contact the restaurant or Menu.ca support')
  lines.push('')
  lines.push('Thank you for choosing Menu.ca!')
  lines.push('Powered by Menu.ca - Connecting you with local restaurants')
  lines.push('========================================')
  
  return lines.join('\n')
}

function generateWelcomeEmailPlainText(data: WelcomeEmailData): string {
  const lines: string[] = []
  const greeting = data.firstName ? `Hi ${data.firstName},` : 'Welcome!'
  
  lines.push('========================================')
  lines.push('         WELCOME TO MENU.CA!')
  lines.push('========================================')
  lines.push('')
  lines.push(greeting)
  lines.push('')
  lines.push('Thank you for creating an account with Menu.ca!')
  lines.push('')
  lines.push('We\'re excited to have you join our community. Your account')
  lines.push('is now active and ready to make ordering from your favorite')
  lines.push('local restaurants easier than ever.')
  lines.push('')
  lines.push('----------------------------------------')
  lines.push('YOUR ACCOUNT BENEFITS')
  lines.push('----------------------------------------')
  lines.push('')
  lines.push('✓ FASTER CHECKOUT')
  lines.push('  Save your delivery addresses and payment methods')
  lines.push('  for quick, seamless ordering')
  lines.push('')
  lines.push('✓ ORDER HISTORY & RE-ORDERING')
  lines.push('  Easily view past orders and reorder your')
  lines.push('  favorites with one click')
  lines.push('')
  lines.push('✓ TRACK YOUR DELIVERIES')
  lines.push('  Stay updated on your order status from')
  lines.push('  preparation to delivery')
  lines.push('')
  lines.push('✓ EXCLUSIVE DEALS')
  lines.push('  Get access to special offers and promotions')
  lines.push('  (coming soon!)')
  lines.push('')
  lines.push('----------------------------------------')
  lines.push('READY TO GET STARTED?')
  lines.push('----------------------------------------')
  lines.push('')
  lines.push('Browse restaurants in your area and discover')
  lines.push('delicious meals from local favorites.')
  lines.push('')
  lines.push('Visit: ' + (process.env.NEXT_PUBLIC_APP_URL || 'https://menu.ca'))
  lines.push('')
  lines.push('========================================')
  lines.push('')
  lines.push('Need help getting started?')
  lines.push('Have questions about your account?')
  lines.push('Our support team is here to assist you.')
  lines.push('')
  lines.push('Thank you for choosing Menu.ca!')
  lines.push('Powered by Menu.ca - Connecting you with local restaurants')
  lines.push('')
  lines.push(`Your email: ${data.email}`)
  lines.push('========================================')
  
  return lines.join('\n')
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationData): Promise<void> {
  const startTime = Date.now()
  
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email Service] RESEND_API_KEY not configured - skipping order confirmation email', {
        orderNumber: data.orderNumber,
        customerEmail: data.customerEmail,
      })
      return
    }

    const { customerEmail, ...templateProps } = data

    console.log('[Email Service] Sending order confirmation email', {
      orderNumber: data.orderNumber,
      restaurantName: data.restaurantName,
      customerEmail,
      itemCount: data.items.length,
      total: data.total,
    })

    const plainTextContent = generateOrderConfirmationPlainText(data)

    await sendEmailWithRetry(
      async () => {
        return await resend.emails.send({
          from: FROM_EMAIL,
          to: customerEmail,
          subject: `Order Confirmation #${data.orderNumber} - ${data.restaurantName}`,
          react: OrderConfirmationEmail(templateProps),
          text: plainTextContent,
        })
      },
      `Order confirmation email (Order #${data.orderNumber})`
    )

    const duration = Date.now() - startTime
    console.log(`[Email Service] ✅ Order confirmation email sent successfully`, {
      orderNumber: data.orderNumber,
      customerEmail,
      durationMs: duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const categorizedError = categorizeError(error)
    
    console.error('[Email Service] ❌ Failed to send order confirmation email', {
      orderNumber: data.orderNumber,
      customerEmail: data.customerEmail,
      errorType: categorizedError.type,
      errorMessage: categorizedError.message,
      retryable: categorizedError.retryable,
      durationMs: duration,
      stack: categorizedError.originalError?.stack,
    })
    
    throw error
  }
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  const startTime = Date.now()
  
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email Service] RESEND_API_KEY not configured - skipping welcome email', {
        email: data.email,
      })
      return
    }

    console.log('[Email Service] Sending welcome email', {
      firstName: data.firstName,
      email: data.email,
    })

    const plainTextContent = generateWelcomeEmailPlainText(data)

    await sendEmailWithRetry(
      async () => {
        return await resend.emails.send({
          from: FROM_EMAIL,
          to: data.email,
          subject: 'Welcome to Menu.ca!',
          react: WelcomeEmail(data),
          text: plainTextContent,
        })
      },
      `Welcome email (${data.email})`
    )

    const duration = Date.now() - startTime
    console.log(`[Email Service] ✅ Welcome email sent successfully`, {
      email: data.email,
      durationMs: duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const categorizedError = categorizeError(error)
    
    console.error('[Email Service] ❌ Failed to send welcome email', {
      email: data.email,
      errorType: categorizedError.type,
      errorMessage: categorizedError.message,
      retryable: categorizedError.retryable,
      durationMs: duration,
      stack: categorizedError.originalError?.stack,
    })
    
    throw error
  }
}
