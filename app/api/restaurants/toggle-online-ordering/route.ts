import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()


    const body = await request.json()
    const { restaurant_id, enabled, reason } = body

    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 })
    }

    if (enabled === undefined || enabled === null) {
      return NextResponse.json({ error: 'enabled is required' }, { status: 400 })
    }

    if (!enabled && !reason) {
      return NextResponse.json({ 
        error: 'Reason is required when disabling online ordering' 
      }, { status: 400 })
    }

    const { data, error } = await supabase.functions.invoke('toggle-online-ordering', {
      body: {
        restaurant_id,
        enabled,
        reason: reason || undefined
      }
    })

    if (error) throw error

    if (!data?.success) {
      return NextResponse.json({ 
        error: data?.message || 'Failed to toggle online ordering' 
      }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to toggle online ordering' },
      { status: 500 }
    )
  }
}
