import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient() as any
    
    // Test 1: Check if service role key exists
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    
    // Test 2: Find restaurants that HAVE locations
    const { data: allLocations, error: allError } = await supabase
      .from('restaurant_locations')
      .select('restaurant_id')
      .limit(1000)
    
    // Get unique restaurant IDs
    const restaurantIds = Array.from(new Set(allLocations?.map((l: any) => l.restaurant_id) || []))
    const sampleId = restaurantIds[0]
    
    // Test 3: Query a restaurant that HAS data
    const { data: locations, error: locError } = await supabase
      .from('restaurant_locations')
      .select('*')
      .eq('restaurant_id', sampleId)
      .limit(3)
    
    // Test 4: Query contacts for same restaurant
    const { data: contacts, error: conError } = await supabase
      .from('restaurant_contacts')
      .select('*')
      .eq('restaurant_id', sampleId)
      .limit(3)
    
    // Test 5: Query schedules
    const { data: schedules, error: schError } = await supabase
      .from('restaurant_schedules')
      .select('*')
      .eq('restaurant_id', sampleId)
      .limit(3)
    
    // Test 6: Count totals
    const { count: totalLocations } = await supabase
      .from('restaurant_locations')
      .select('*', { count: 'exact', head: true })
    
    const { count: totalContacts } = await supabase
      .from('restaurant_contacts')
      .select('*', { count: 'exact', head: true })
    
    const { count: totalSchedules } = await supabase
      .from('restaurant_schedules')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      config: {
        hasServiceKey,
        hasUrl,
        serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20)
      },
      totals: {
        locations: totalLocations,
        contacts: totalContacts,
        schedules: totalSchedules,
        restaurantsWithLocations: restaurantIds.length
      },
      sampleRestaurantId: sampleId,
      sampleData: {
        locations: {
          count: locations?.length || 0,
          error: locError?.message,
          sample: locations?.[0]
        },
        contacts: {
          count: contacts?.length || 0,
          error: conError?.message,
          sample: contacts?.[0]
        },
        schedules: {
          count: schedules?.length || 0,
          error: schError?.message,
          sample: schedules?.[0]
        }
      },
      restaurantsWithLocations: restaurantIds.slice(0, 20)
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
