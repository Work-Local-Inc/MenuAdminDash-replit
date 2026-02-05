export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startOrderFallbackScheduler } = await import('./lib/cron/order-fallback-scheduler')
    startOrderFallbackScheduler()
  }
}
