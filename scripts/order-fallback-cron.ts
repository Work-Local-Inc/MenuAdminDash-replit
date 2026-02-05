#!/usr/bin/env npx ts-node

const CRON_SECRET = process.env.ORDER_FALLBACK_CRON_SECRET

async function runFallbackCron() {
  if (!CRON_SECRET) {
    console.error('[Cron] ORDER_FALLBACK_CRON_SECRET not set')
    process.exit(1)
  }

  const baseUrl = process.env.TWILIO_VOICE_BASE_URL || 
                  process.env.REPLIT_DEPLOYMENT_URL ||
                  process.env.REPLIT_DEV_DOMAIN ||
                  'http://localhost:3000'

  const cronUrl = `${baseUrl}/api/cron/order-fallback?token=${CRON_SECRET}`

  console.log(`[Cron] Starting order fallback check at ${new Date().toISOString()}`)
  console.log(`[Cron] Calling: ${baseUrl}/api/cron/order-fallback`)

  try {
    const response = await fetch(cronUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`[Cron] API returned ${response.status}: ${text}`)
      process.exit(1)
    }

    const result = await response.json()
    
    console.log('[Cron] Result:', JSON.stringify(result, null, 2))
    console.log(`[Cron] Completed: ${result.callsPlaced || 0} calls placed, ${result.callsSkipped || 0} skipped, ${result.callsFailed || 0} failed`)
    
    process.exit(0)
  } catch (error) {
    console.error('[Cron] Error calling fallback API:', error)
    process.exit(1)
  }
}

runFallbackCron()
