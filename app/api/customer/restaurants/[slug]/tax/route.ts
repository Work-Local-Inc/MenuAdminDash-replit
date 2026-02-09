import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractIdFromSlug } from '@/lib/utils/slugify'
export const dynamic = 'force-dynamic'

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
    
    console.log('[Tax API] Fetching tax info for restaurant:', restaurantId)
    
    const { data: taxInfo, error } = await supabase
      .from('restaurant_tax_info')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .maybeSingle()
    
    console.log('[Tax API] Query result:', { taxInfo, error, restaurantId })
    
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
      console.log('[Tax API] No tax info found for restaurant, returning Ontario HST default')
      return NextResponse.json({
        province_id: 1,
        province_code: 'ON',
        province_name: 'Ontario',
        total_rate: 0.13,
        tax_components: [{ type: 'HST', rate: 0.13 }]
      })
    }
    
    // Map database field names to expected API format
    // View uses 'taxes' and 'total_tax_rate', API expects 'tax_components' and 'total_rate'
    return NextResponse.json({
      province_id: taxInfo.province_id,
      province_code: taxInfo.province_code?.trim(),
      province_name: taxInfo.province_name,
      total_rate: taxInfo.total_tax_rate,
      tax_components: taxInfo.taxes || []
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
