import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { auth_user_id, email, first_name, last_name, phone } = body

    // Validate required fields
    if (!auth_user_id || !email || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use admin client with service role key to bypass RLS and have insert permissions
    const supabase = createAdminClient()

    // Try to insert with auth_user_id first (if column exists)
    let userError = null
    let userData = null
    
    const insertData: any = {
      auth_user_id,
      email,
      first_name,
      last_name,
      phone: phone || null,
    }

    const { data, error } = await supabase
      .from('users')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      // If auth_user_id column doesn't exist, try without it
      if (error.code === 'PGRST204' || error.code === '42703') {
        const { auth_user_id, ...dataWithoutAuthId } = insertData
        const { data: retryData, error: retryError } = await supabase
          .from('users')
          .insert(dataWithoutAuthId)
          .select()
          .single()

        if (retryError) {
          console.error('Failed to create user record:', retryError)
          return NextResponse.json(
            { error: 'Failed to create user account', details: retryError.message },
            { status: 500 }
          )
        }

        userData = retryData
      } else {
        console.error('Failed to create user record:', error)
        return NextResponse.json(
          { error: 'Failed to create user account', details: error.message },
          { status: 500 }
        )
      }
    } else {
      userData = data
    }

    return NextResponse.json({ success: true, user: userData })
  } catch (error: any) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
