import { sendOrderConfirmationEmail } from '../lib/emails/service'
import { createAdminClient } from '../lib/supabase/admin'

interface Restaurant {
  id: number
  name: string
  logo_url: string | null
}

async function testEmail() {
  console.log('Testing order confirmation email with REAL restaurant data...')
  
  const adminSupabase = createAdminClient()
  
  // Fetch Orchid Sushi specifically (going live with this restaurant)
  const { data: orchidSushi, error } = await adminSupabase
    .from('restaurants')
    .select('id, name, logo_url')
    .ilike('name', '%orchid%sushi%')
    .limit(1)
    .single() as { data: Restaurant | null; error: any }
  
  let restaurant: Restaurant | null = orchidSushi
  
  if (error || !restaurant) {
    console.log('Orchid Sushi not found, searching for any restaurant with a logo...')
    const { data: fallback } = await adminSupabase
      .from('restaurants')
      .select('id, name, logo_url')
      .not('logo_url', 'is', null)
      .limit(1)
      .single() as { data: Restaurant | null }
    restaurant = fallback
  }

  if (!restaurant) {
    console.error('No restaurants found in database!')
    process.exit(1)
  }

  console.log(`\nUsing restaurant: ${restaurant.name}`)
  console.log(`Logo URL: ${restaurant.logo_url || 'None (will use Menu.ca logo)'}`)

  const testOrderData = {
    orderNumber: 'TEST-' + Date.now().toString().slice(-5),
    restaurantName: restaurant.name,
    restaurantLogoUrl: restaurant.logo_url || undefined,
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
    estimatedDeliveryTime: 'ASAP (45-60 minutes)',
    customerEmail: process.env.TEST_EMAIL || 'test@example.com',
  }

  console.log('\nConfiguration:', {
    hasApiKey: !!process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    toEmail: testOrderData.customerEmail,
    hasLogo: !!testOrderData.restaurantLogoUrl,
  })

  try {
    await sendOrderConfirmationEmail(testOrderData)
    console.log('\n✅ Email sent successfully!')
    console.log('\nPlease check your inbox at:', testOrderData.customerEmail)
    console.log('Look for an email from:', restaurant.name)
  } catch (error) {
    console.error('❌ Email failed:', error)
    process.exit(1)
  }
}

testEmail()
