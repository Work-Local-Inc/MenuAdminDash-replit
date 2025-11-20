import { sendOrderConfirmationEmail } from '../lib/emails/service'

const testOrderData = {
  orderNumber: 'TEST-12345',
  restaurantName: 'Capri Pizza',
  items: [
    {
      dish_id: 1,
      name: 'Margherita Pizza',
      size: 'Large',
      quantity: 2,
      unit_price: 18.99,
      subtotal: 37.98,
      modifiers: [
        { id: 1, name: 'Extra Cheese', price: 2.50 },
        { id: 2, name: 'Olives', price: 1.50 },
      ],
    },
    {
      dish_id: 2,
      name: 'Caesar Salad',
      size: 'Regular',
      quantity: 1,
      unit_price: 8.99,
      subtotal: 8.99,
      modifiers: [],
    },
  ],
  deliveryAddress: {
    street: '123 Main Street, Apt 4B',
    city: 'Ottawa',
    province: 'ON',
    postal_code: 'K1A 0B1',
    delivery_instructions: 'Please ring doorbell twice and leave at door',
  },
  subtotal: 46.97,
  deliveryFee: 5.00,
  tax: 6.76,
  taxLabel: 'HST (13%)',
  total: 58.73,
  estimatedDeliveryTime: '30-40 minutes',
  customerEmail: process.env.TEST_EMAIL || 'test@example.com',
}

async function testEmail() {
  console.log('Testing order confirmation email...')
  console.log('Configuration:', {
    hasApiKey: !!process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    toEmail: testOrderData.customerEmail,
  })

  try {
    await sendOrderConfirmationEmail(testOrderData)
    console.log('✅ Email sent successfully!')
    console.log('\nPlease check your inbox at:', testOrderData.customerEmail)
  } catch (error) {
    console.error('❌ Email failed:', error)
    process.exit(1)
  }
}

testEmail()
