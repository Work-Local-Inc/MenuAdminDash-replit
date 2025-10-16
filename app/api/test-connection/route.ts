import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test restaurant query
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name, status')
      .limit(5)
    
    if (restaurantsError) {
      return NextResponse.json({ 
        success: false,
        error: 'Restaurant query failed', 
        details: restaurantsError 
      }, { status: 500 })
    }
    
    // Get counts
    const { count: restaurantCount, error: rCountError } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true })
    
    const { count: userCount, error: uCountError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      success: true,
      connection: 'CONNECTED',
      sampleRestaurants: restaurants,
      counts: {
        restaurants: restaurantCount || 0,
        users: userCount || 0
      },
      errors: {
        restaurantCount: rCountError,
        userCount: uCountError
      }
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: 'Connection failed', 
      details: error?.message || error 
    }, { status: 500 })
  }
}
