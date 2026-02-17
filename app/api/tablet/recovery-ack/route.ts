import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyDeviceAuth, isAuthError } from '@/lib/tablet/verify-device'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyDeviceAuth(request)
    if (isAuthError(authResult)) {
      return authResult
    }

    const body = await request.json()
    const { command_id, status, result } = body

    if (!command_id || typeof command_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid command_id' },
        { status: 400 }
      )
    }

    if (!status || !['executed', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "executed" or "failed"' },
        { status: 400 }
      )
    }

    try {
      const supabase = createAdminClient() as any

      const { data, error } = await supabase
        .from('device_recovery_commands')
        .update({
          execution_status: status,
          executed_at: new Date().toISOString(),
          execution_result: result || null,
        })
        .eq('command_id', command_id)
        .select()
        .single()

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return NextResponse.json({ success: true, message: 'Table not available yet' })
        }
        console.error('[Recovery Ack] Update error:', error)
        return NextResponse.json(
          { error: 'Failed to acknowledge recovery command' },
          { status: 500 }
        )
      }

      console.log(`[Recovery Ack] Command ${command_id} acknowledged with status: ${status}`)

      return NextResponse.json({ success: true, command: data })
    } catch (e) {
      return NextResponse.json({ success: true, message: 'Table not available yet' })
    }
  } catch (error: any) {
    console.error('[Recovery Ack] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Recovery acknowledgment failed' },
      { status: 500 }
    )
  }
}
