import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const parentId = parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const periodDays = parseInt(searchParams.get('period_days') || '30')
    
    const [analyticsResult, comparisonResult, menuCoverageResult] = await Promise.all([
      supabase.rpc('get_franchise_analytics', { 
        p_parent_id: parentId,
        p_period_days: periodDays
      }),
      supabase.rpc('compare_franchise_locations', { 
        p_parent_id: parentId,
        p_period_days: periodDays
      }),
      supabase.rpc('get_franchise_menu_coverage', { 
        p_parent_id: parentId
      })
    ])
    
    if (analyticsResult.error) throw analyticsResult.error
    if (comparisonResult.error) throw comparisonResult.error
    if (menuCoverageResult.error) throw menuCoverageResult.error
    
    return NextResponse.json({
      analytics: analyticsResult.data,
      comparison: comparisonResult.data || [],
      menuCoverage: menuCoverageResult.data
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch franchise analytics' 
    }, { status: 500 })
  }
}
