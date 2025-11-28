import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
    
    const supabase = createAdminClient() as any
    
    // Get rating filter from query params
    const { searchParams } = new URL(request.url)
    const ratingFilter = searchParams.get('rating')
    
    let query = supabase
      .from('restaurant_feedback')
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          email
        )
      `)
      .eq('restaurant_id', parseInt(params.id))
      .order('created_at', { ascending: false })
    
    // Apply rating filter if provided
    if (ratingFilter && ratingFilter !== 'all') {
      query = query.eq('rating', parseInt(ratingFilter))
    }
    
    const { data, error } = await query
    
    if (error) {
      throw error
    }
    
    return NextResponse.json(data || [])
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch feedback' }, { status: 500 })
  }
}
