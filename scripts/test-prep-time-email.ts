import { sendOrderConfirmationEmail } from '../lib/emails/service'
import { getEffectivePrepTime, formatPrepTimeRange } from '../lib/utils/prep-time'

const RESTAURANT_ID = 1021
const TEST_EMAIL = process.env.ADMIN_TEST_EMAIL || 'test@example.com'

async function sendTestEmail(testName: string) {
  console.log(`\n=== ${testName} ===`)
  
  // Get the effective prep time
  const prepTimeResult = await getEffectivePrepTime(RESTAURANT_ID)
  console.log('Prep time result:', prepTimeResult)
  
  // Format for delivery
  const estimatedTime = formatPrepTimeRange(prepTimeResult.prep_time_minutes, 'delivery')
  console.log('Formatted time for email:', estimatedTime)
  
  // Send test email
  const result = await sendOrderConfirmationEmail({
    orderNumber: `TEST-${Date.now()}`,
    restaurantName: "JJ's Shawarma",
    restaurantLogoUrl: "https://nthpbtdjhhnwfxqsxbvy.supabase.co/storage/v1/object/public/restaurant-logos/1021/1764785503481_jj-logo.png",
    items: [
      {
        dish_id: 1,
        name: "Chicken Shawarma Wrap",
        size: "Regular",
        quantity: 1,
        unit_price: 12.99,
        subtotal: 12.99
      },
      {
        dish_id: 2,
        name: "Falafel Plate",
        size: "Large",
        quantity: 1,
        unit_price: 15.99,
        subtotal: 15.99
      }
    ],
    orderType: 'delivery',
    deliveryAddress: {
      street: "123 Test Street",
      city: "Toronto",
      province: "ON",
      postal_code: "M5V 1A1"
    },
    subtotal: 28.98,
    deliveryFee: 4.99,
    tax: 3.77,
    total: 37.74,
    estimatedDeliveryTime: estimatedTime,
    customerEmail: TEST_EMAIL
  })
  
  console.log('Email sent result:', result)
  console.log(`\n✓ ${testName} email sent to ${TEST_EMAIL}`)
  console.log(`  Mode: ${prepTimeResult.mode}`)
  console.log(`  Is Busy: ${prepTimeResult.is_busy}`)
  console.log(`  Prep Time: ${prepTimeResult.prep_time_minutes} minutes`)
  console.log(`  Email shows: "${estimatedTime}"`)
}

sendTestEmail('NORMAL MODE TEST').catch(console.error)
