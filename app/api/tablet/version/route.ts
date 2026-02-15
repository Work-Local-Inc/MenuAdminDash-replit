import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const supabase = createAdminClient() as any

    const { data, error } = await supabase
      .from('tablet_app_versions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[Tablet Version] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch version config' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || null })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error('[Tablet Version] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    await verifyAdminAuth(request)

    const body = await request.json()
    const { min_version, latest_version, required, message, update_url } = body

    const supabase = createAdminClient() as any

    const { data: existing, error: fetchError } = await supabase
      .from('tablet_app_versions')
      .select('id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'No active version record found' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('tablet_app_versions')
      .update({
        min_version,
        latest_version,
        required,
        message,
        update_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('[Tablet Version] Update error:', error)
      return NextResponse.json(
        { error: 'Failed to update version config' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error('[Tablet Version] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
