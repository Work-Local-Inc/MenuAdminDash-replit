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
    let publishableKey: string | undefined
    let keySource: string = ''
    
    // Debug: Log all available Stripe keys at runtime
    console.log('[PaymentConfig] DEBUG - Available keys:', {
      NEXT_PUBLIC_STRIPE_PUBLIC_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ? process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY.substring(0, 15) + '...' : 'NOT SET',
      VITE_STRIPE_PUBLIC_KEY: process.env.VITE_STRIPE_PUBLIC_KEY ? process.env.VITE_STRIPE_PUBLIC_KEY.substring(0, 15) + '...' : 'NOT SET',
      NEXT_PUBLIC_TESTING_VITE_STRIPE_PUBLIC_KEY: process.env.NEXT_PUBLIC_TESTING_VITE_STRIPE_PUBLIC_KEY ? process.env.NEXT_PUBLIC_TESTING_VITE_STRIPE_PUBLIC_KEY.substring(0, 15) + '...' : 'NOT SET',
      TESTING_VITE_STRIPE_PUBLIC_KEY: process.env.TESTING_VITE_STRIPE_PUBLIC_KEY ? process.env.TESTING_VITE_STRIPE_PUBLIC_KEY.substring(0, 15) + '...' : 'NOT SET',
    })
    
    if (paymentMode === 'live') {
      // Use live publishable key for real payments
      publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || process.env.VITE_STRIPE_PUBLIC_KEY
      keySource = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ? 'NEXT_PUBLIC_STRIPE_PUBLIC_KEY' : 'VITE_STRIPE_PUBLIC_KEY'
    } else {
      // Use test publishable key for testing
      publishableKey = process.env.NEXT_PUBLIC_TESTING_VITE_STRIPE_PUBLIC_KEY || process.env.TESTING_VITE_STRIPE_PUBLIC_KEY
      keySource = process.env.NEXT_PUBLIC_TESTING_VITE_STRIPE_PUBLIC_KEY ? 'NEXT_PUBLIC_TESTING_VITE_STRIPE_PUBLIC_KEY' : 'TESTING_VITE_STRIPE_PUBLIC_KEY'
    }
    
    console.log(`[PaymentConfig] Restaurant ${restaurantId} - Mode: ${paymentMode}, Source: ${keySource}, Key prefix: ${publishableKey?.substring(0, 15)}`)
    
    if (!publishableKey) {
      console.error('[PaymentConfig] Missing Stripe publishable key for mode:', paymentMode)
      return NextResponse.json({ 
        error: `Missing Stripe publishable key for ${paymentMode} mode` 
      }, { status: 500 })
    }
    
    return NextResponse.json({
      paymentMode,
      publishableKey,
    })
    
  } catch (error) {
    console.error('[PaymentConfig] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
