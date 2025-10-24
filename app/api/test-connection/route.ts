import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use direct Supabase client (bypass auth)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: { schema: 'menuca_v3' }
  }
)

export async function GET() {
  try {
    console.log('🔍 Testing Supabase connection...')
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    
    // Test 1: Query restaurants from menuca_v3 schema
    const { data: restaurants, error: restaurantsError } = await supabase
      .schema('menuca_v3').from('restaurants')
      .select('id, name, status')
      .limit(5)
    
    if (restaurantsError) {
      console.error('❌ Restaurant query error:', restaurantsError)
      return NextResponse.json({ 
        success: false,
        error: 'Restaurant query failed', 
        details: restaurantsError 
      }, { status: 500 })
    }
    
    console.log('✅ Found restaurants:', restaurants?.length)
    
    // Test 2: Get counts
    const { count: restaurantCount, error: rCountError } = await supabase
      .schema('menuca_v3').from('restaurants')
      .select('*', { count: 'exact', head: true })
    
    const { count: userCount, error: uCountError } = await supabase
      .schema('menuca_v3').from('users')
      .select('*', { count: 'exact', head: true })
    
    console.log('✅ Restaurant count:', restaurantCount)
    console.log('✅ User count:', userCount)
    
    return NextResponse.json({
      success: true,
      connection: '✅ CONNECTED TO menuca_v3 SCHEMA',
      schemaExposed: true,
      sampleRestaurants: restaurants,
      counts: {
        restaurants: restaurantCount || 0,
        users: userCount || 0
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ Connection test failed:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Connection failed', 
      details: error?.message || error 
    }, { status: 500 })
  }
}
