import { sendWelcomeEmail } from '../lib/emails/service'

const testEmailWithName = {
  firstName: 'John',
  email: process.env.TEST_EMAIL || 'test@example.com',
}

const testEmailWithoutName = {
  firstName: '',
  email: process.env.TEST_EMAIL || 'test@example.com',
}

async function testWelcomeEmail() {
  console.log('Testing welcome email...')
  console.log('Configuration:', {
    hasApiKey: !!process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    toEmail: testEmailWithName.email,
  })

  console.log('\n--- Test 1: Welcome email WITH first name ---')
  try {
    await sendWelcomeEmail(testEmailWithName)
    console.log('✅ Email with name sent successfully!')
  } catch (error) {
    console.error('❌ Email with name failed:', error)
    process.exit(1)
  }

  console.log('\n--- Test 2: Welcome email WITHOUT first name ---')
  try {
    await sendWelcomeEmail(testEmailWithoutName)
    console.log('✅ Email without name sent successfully!')
  } catch (error) {
    console.error('❌ Email without name failed:', error)
    process.exit(1)
  }

  console.log('\n✅ All tests passed!')
  console.log(`\nPlease check your inbox at: ${testEmailWithName.email}`)
  console.log('You should have received 2 welcome emails:')
  console.log('  1. With personalized greeting: "Hi John,"')
  console.log('  2. With default greeting: "Welcome!"')
}

testWelcomeEmail()
