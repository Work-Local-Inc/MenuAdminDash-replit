import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractIdFromSlug } from '@/lib/utils/slugify'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const restaurantId = extractIdFromSlug(slug)
    
    if (!restaurantId) {
      return NextResponse.json({ error: 'Invalid restaurant slug' }, { status: 400 })
    }
    
    const adminSupabase = createAdminClient() as any
    
    // Fetch restaurant's payment mode from service config
    const { data: config, error } = await adminSupabase
      .from('delivery_and_pickup_configs')
      .select('payment_mode')
      .eq('restaurant_id', restaurantId)
      .maybeSingle()
    
    if (error) {
      console.error('[PaymentConfig] Error fetching config:', error)
    }
    
    // Default to test mode if not set
    const paymentMode = config?.payment_mode || 'test'
    
    // Return the appropriate publishable key based on payment mode
    // SIMPLIFIED: Direct env var access, no fallback chains
    let publishableKey: string | undefined
    let keySource: string = ''
    
    if (paymentMode === 'live') {
      // For LIVE mode: Use VITE_STRIPE_PUBLIC_KEY (should be pk_live_...)
      publishableKey = process.env.VITE_STRIPE_PUBLIC_KEY
      keySource = 'VITE_STRIPE_PUBLIC_KEY'
    } else {
      // For TEST mode: Use NEXT_PUBLIC_TESTING_VITE_STRIPE_PUBLIC_KEY (should be pk_test_...)
      publishableKey = process.env.NEXT_PUBLIC_TESTING_VITE_STRIPE_PUBLIC_KEY
      keySource = 'NEXT_PUBLIC_TESTING_VITE_STRIPE_PUBLIC_KEY'
    }
    
    console.log(`[PaymentConfig] Restaurant ${restaurantId} - Mode: ${paymentMode}, Source: ${keySource}, Key: ${publishableKey?.substring(0, 20) || 'NOT SET'}`)
    
    if (!publishableKey) {
      console.error('[PaymentConfig] Missing Stripe publishable key for mode:', paymentMode)
      return NextResponse.json({ 
        error: `Missing Stripe publishable key for ${paymentMode} mode` 
      }, { status: 500 })
    }
    
    const response = NextResponse.json({
      paymentMode,
      publishableKey,
    })
    
    // Prevent caching to ensure fresh payment mode on every request
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
    
  } catch (error) {
    console.error('[PaymentConfig] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
