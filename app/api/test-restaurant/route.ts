import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    // Use ADMIN client to bypass RLS
    const supabase = createAdminClient()
    const restaurantId = request.nextUrl.searchParams.get('id') || '73'

    // Check what table is being requested
    const checkTable = request.nextUrl.searchParams.get('check')
    
    if (checkTable === 'users') {
      // Check admin_users table WITHOUT join
      const { data: adminData, error: adminError, count: adminCount } = await supabase
        .from('admin_users')
        .select('*', { count: 'exact' })
        .limit(3)
      
      return NextResponse.json({
        success: true,
        admin_users: { count: adminCount, sample: adminData, error: adminError?.message },
        note: "Check if role_id column exists in admin_users"
      })
    }
    
    // Default: check restaurants
    const { data, error, count } = await supabase
      .from('restaurants')
      .select('id, name, status', { count: 'exact' })
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      count,
      restaurants: data,
      error: error?.message || null
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
