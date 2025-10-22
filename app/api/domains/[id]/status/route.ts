import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const domainId = parseInt(params.id)
    if (isNaN(domainId)) {
      return NextResponse.json(
        { error: 'Invalid domain ID' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get single domain verification status
    const { data, error } = await supabase.rpc('get_domain_verification_status', {
      p_domain_id: domainId
    })

    if (error) {
      console.error('[Domain Status] Error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data[0])
  } catch (error: any) {
    console.error('[Domain Status] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
