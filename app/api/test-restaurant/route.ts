import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    // Use ADMIN client to bypass RLS
    const supabase = createAdminClient()
    const restaurantId = request.nextUrl.searchParams.get('id') || '73'

    // Test with admin client
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
