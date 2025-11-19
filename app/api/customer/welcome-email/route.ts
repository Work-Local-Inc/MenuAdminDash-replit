import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/emails/service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details from the users table (query by auth_user_id, not id)
    const { data: userRecord } = await supabase
      .from('users')
      .select('first_name, email')
      .eq('auth_user_id', user.id)
      .single() as { data: { first_name: string; email: string } | null }

    if (!userRecord) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 })
    }

    // Send welcome email
    await sendWelcomeEmail({
      firstName: userRecord.first_name,
      email: userRecord.email,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending welcome email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send welcome email' },
      { status: 500 }
    )
  }
}
