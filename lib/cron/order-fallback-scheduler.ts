import cron from 'node-cron'

let isSchedulerRunning = false

export function startOrderFallbackScheduler() {
  if (isSchedulerRunning) {
    console.log('[Cron Scheduler] Already running, skipping duplicate start')
    return
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Cron Scheduler] Skipping in development - production cron handles fallback calls')
    return
  }

  const cronSecret = process.env.ORDER_FALLBACK_CRON_SECRET
  const baseUrl = process.env.TWILIO_VOICE_BASE_URL || 
                  process.env.REPLIT_DEPLOYMENT_URL ||
                  'http://localhost:3000'

  if (!cronSecret) {
    console.warn('[Cron Scheduler] ORDER_FALLBACK_CRON_SECRET not set, scheduler disabled')
    return
  }

  console.log('[Cron Scheduler] Starting order fallback scheduler (every 2 minutes)')
  isSchedulerRunning = true

  cron.schedule('*/2 * * * *', async () => {
    console.log(`[Cron Scheduler] Running order fallback check at ${new Date().toISOString()}`)
    
    try {
      const cronUrl = `${baseUrl}/api/cron/order-fallback?token=${cronSecret}`
      
      const response = await fetch(cronUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        console.error(`[Cron Scheduler] API returned ${response.status}`)
        return
      }

      const result = await response.json()
      console.log(`[Cron Scheduler] Completed: ${result.callsPlaced || 0} calls placed, ${result.callsSkipped || 0} skipped`)
    } catch (error) {
      console.error('[Cron Scheduler] Error:', error)
    }
  })
}
