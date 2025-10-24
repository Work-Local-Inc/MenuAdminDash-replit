import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
    
    const supabase = createAdminClient()
    
    const parentId = parseInt(params.id)
    
    const [summaryResult, childrenResult] = await Promise.all([
      supabase.rpc('get_franchise_summary', { p_parent_id: parentId }),
      supabase.rpc('get_franchise_children', { p_parent_id: parentId })
    ])
    
    if (summaryResult.error) throw summaryResult.error
    if (childrenResult.error) throw childrenResult.error
    
    return NextResponse.json({
      summary: summaryResult.data,
      children: childrenResult.data || []
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch franchise details' 
    }, { status: 500 })
  }
}
