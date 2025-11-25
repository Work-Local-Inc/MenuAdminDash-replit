import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use service role key to bypass RLS (if available)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // Try service role key first, fall back to anon key
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: { schema: 'menuca_v3' }
  }
)

export async function GET() {
  try {
    console.log('🔍 Debugging data access...')
    
    // Try to get sample restaurants
    const { data: restaurants, error: rError } = await supabase
      .from('restaurants')
      .select('id, name, status')
      .limit(5)
    
    // Try to get sample users
    const { data: users, error: uError } = await supabase
      .from('users')
      .select('id, email')
      .limit(5)
    
    // Get counts
    const { count: rCount } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true })
      
    const { count: uCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      success: true,
      usingServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      data: {
        restaurants: {
          sample: restaurants || [],
          count: rCount || 0,
          error: rError?.message
        },
        users: {
          sample: users?.map(u => ({ ...u, email: u.email?.slice(0, 10) + '...' })) || [],
          count: uCount || 0,
          error: uError?.message
        }
      },
      note: 'If counts are still 0, the database might be empty or using different table names'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
