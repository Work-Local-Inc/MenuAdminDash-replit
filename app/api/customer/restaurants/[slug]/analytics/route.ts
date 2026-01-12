import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    if (!slug) {
      return NextResponse.json({ error: 'Restaurant slug is required' }, { status: 400 })
    }

    const parts = slug.split('-')
    const restaurantId = parts.length > 0 ? parseInt(parts[parts.length - 1], 10) : null

    if (!restaurantId || isNaN(restaurantId)) {
      return NextResponse.json({ ga_measurement_id: null })
    }

    const adminSupabase = createAdminClient()
    const { data, error } = await (adminSupabase as any)
      .schema('menuca_v3')
      .from('restaurant_analytics_configs')
      .select('ga_measurement_id, is_enabled')
      .eq('restaurant_id', restaurantId)
      .eq('is_enabled', true)
      .single()

    if (error || !data) {
      return NextResponse.json({ ga_measurement_id: null })
    }

    return NextResponse.json({
      ga_measurement_id: data.ga_measurement_id || null,
    })
  } catch (error) {
    console.error('[Analytics API] Error fetching GA config:', error)
    return NextResponse.json({ ga_measurement_id: null })
  }
}
