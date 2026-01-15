import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractIdFromSlug } from '@/lib/utils/slugify'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params
    const { slug } = resolvedParams
    
    const restaurantId = extractIdFromSlug(slug)
    if (!restaurantId) {
      return NextResponse.json({ error: 'Invalid restaurant slug' }, { status: 400 })
    }
    
    const supabase = createAdminClient() as any
    
    const { data: taxInfo, error } = await supabase
      .from('restaurant_tax_info')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .maybeSingle()
    
    if (error) {
      console.error('[Tax API] Error fetching tax info:', error)
      return NextResponse.json({
        province_id: 1,
        province_code: 'ON',
        province_name: 'Ontario',
        total_rate: 0.13,
        tax_components: [{ type: 'HST', rate: 0.13 }]
      })
    }
    
    if (!taxInfo) {
      return NextResponse.json({
        province_id: 1,
        province_code: 'ON',
        province_name: 'Ontario',
        total_rate: 0.13,
        tax_components: [{ type: 'HST', rate: 0.13 }]
      })
    }
    
    return NextResponse.json({
      province_id: taxInfo.province_id,
      province_code: taxInfo.province_code,
      province_name: taxInfo.province_name,
      total_rate: taxInfo.total_rate,
      tax_components: taxInfo.tax_components
    })
  } catch (error: any) {
    console.error('[Tax API] Error:', error)
    return NextResponse.json({
      province_id: 1,
      province_code: 'ON',
      province_name: 'Ontario',
      total_rate: 0.13,
      tax_components: [{ type: 'HST', rate: 0.13 }]
    })
  }
}
