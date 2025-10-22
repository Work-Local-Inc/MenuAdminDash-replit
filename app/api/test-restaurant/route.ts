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
      // Check users table
      const { data: usersData, error: usersError, count: usersCount } = await supabase
        .from('users')
        .select('id, name, email, phone, created_at', { count: 'exact' })
        .limit(10)
      
      // Check admin_users table  
      const { data: adminData, error: adminError, count: adminCount } = await supabase
        .from('admin_users')
        .select('*', { count: 'exact' })
        .limit(10)
      
      return NextResponse.json({
        success: true,
        users: { count: usersCount, data: usersData, error: usersError?.message },
        admin_users: { count: adminCount, data: adminData, error: adminError?.message }
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
