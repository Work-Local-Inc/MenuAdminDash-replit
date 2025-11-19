import { resend } from './client'
import OrderConfirmationEmail from './templates/order-confirmation'
import WelcomeEmail from './templates/welcome'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

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
  total: number
  estimatedDeliveryTime?: string
  customerEmail: string
}

interface WelcomeEmailData {
  firstName: string
  email: string
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationData): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured - skipping order confirmation email')
      return
    }

    const { customerEmail, ...templateProps } = data

    await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Order Confirmation #${data.orderNumber} - ${data.restaurantName}`,
      react: OrderConfirmationEmail(templateProps),
    })

    console.log(`Order confirmation email sent to ${customerEmail} for order #${data.orderNumber}`)
  } catch (error) {
    console.error('Failed to send order confirmation email:', error)
    throw error
  }
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured - skipping welcome email')
      return
    }

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: 'Welcome to Menu.ca!',
      react: WelcomeEmail(data),
    })

    console.log(`Welcome email sent to ${data.email}`)
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    throw error
  }
}
