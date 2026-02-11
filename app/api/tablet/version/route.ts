import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const DEFAULT_UPDATE_URL = 'market://details?id=ca.menu.orders'

function envBool(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) return defaultValue
  return value.toLowerCase() === 'true'
}

export async function GET() {
  const fallback = {
    min_version: process.env.TABLET_MIN_VERSION || '0.0.0',
    latest_version: process.env.TABLET_LATEST_VERSION || '',
    required: envBool(process.env.TABLET_FORCE_UPDATE, false),
    message:
      process.env.TABLET_UPDATE_MESSAGE ||
      'Update required to continue receiving orders.',
    update_url: process.env.TABLET_UPDATE_URL || DEFAULT_UPDATE_URL,
  }

  try {
    const supabase = createAdminClient() as any
    const { data, error } = await supabase
      .from('tablet_app_versions')
      .select('min_version, latest_version, required, message, update_url, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn('[Tablet Version] Lookup failed, using fallback:', error.message || error)
      return NextResponse.json({ ...fallback, server_time: new Date().toISOString() })
    }

    if (!data) {
      return NextResponse.json({ ...fallback, server_time: new Date().toISOString() })
    }

    return NextResponse.json({
      min_version: data.min_version || fallback.min_version,
      latest_version: data.latest_version || fallback.latest_version,
      required: typeof data.required === 'boolean' ? data.required : fallback.required,
      message: data.message || fallback.message,
      update_url: data.update_url || fallback.update_url,
      server_time: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[Tablet Version] Error:', error)
    return NextResponse.json({ ...fallback, server_time: new Date().toISOString() })
  }
}
