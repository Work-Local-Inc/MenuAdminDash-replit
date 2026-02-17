import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import crypto from 'crypto'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdminAuth(request)

    const { id } = await params
    const deviceId = parseInt(id)

    if (isNaN(deviceId)) {
      return NextResponse.json(
        { error: 'Invalid device ID' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient() as any

    try {
      const { data: commands, error } = await supabase
        .from('device_recovery_commands')
        .select('*')
        .eq('device_id', deviceId)
        .order('issued_at', { ascending: false })

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return NextResponse.json([])
        }
        console.error('[Recovery Commands] Query error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch recovery commands' },
          { status: 500 }
        )
      }

      return NextResponse.json(commands || [])
    } catch (e) {
      return NextResponse.json([])
    }
  } catch (error: any) {
    console.error('[Recovery Commands] Error:', error)

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch recovery commands' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { adminUser } = await verifyAdminAuth(request)

    const { id } = await params
    const deviceId = parseInt(id)

    if (isNaN(deviceId)) {
      return NextResponse.json(
        { error: 'Invalid device ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { action, reason } = body

    if (!action || !['resync', 'reload_app'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "resync" or "reload_app"' },
        { status: 400 }
      )
    }

    const command_id = `cmd_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`

    const supabase = createAdminClient() as any

    try {
      const { data: command, error } = await supabase
        .from('device_recovery_commands')
        .insert({
          device_id: deviceId,
          command_id,
          action,
          reason: reason || null,
          issued_by: adminUser.email,
          execution_status: 'pending',
        })
        .select()
        .single()

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return NextResponse.json(
            { error: 'Recovery commands table does not exist. Please run the migration: scripts/migrations/add-device-health-columns.sql' },
            { status: 500 }
          )
        }
        console.error('[Recovery Commands] Insert error:', error)
        return NextResponse.json(
          { error: 'Failed to issue recovery command' },
          { status: 500 }
        )
      }

      console.log(`[Recovery Commands] Command ${command_id} issued for device ${deviceId} by ${adminUser.email}: ${action}`)

      return NextResponse.json(command, { status: 201 })
    } catch (e: any) {
      console.error('[Recovery Commands] Insert error:', e)
      return NextResponse.json(
        { error: 'Recovery commands table may not exist. Please run the migration: scripts/migrations/add-device-health-columns.sql' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[Recovery Commands] Error:', error)

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to issue recovery command' },
      { status: 500 }
    )
  }
}
