import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import Stripe from 'stripe'
import { sendWelcomeEmail } from '@/lib/emails/service'

// Use TEST Stripe keys to match payment intent creation
const stripeSecretKey = process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error('Missing required Stripe secret key')
}

const stripe = new Stripe(stripeSecretKey, {})

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  name: z.string().optional(),
  phone: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const validation = signupSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, password, name, phone } = validation.data

    const supabase = createAdminClient() as any

    let first_name = ''
    let last_name = ''
    
    if (name) {
      const nameParts = name.trim().split(/\s+/)
      first_name = nameParts[0] || ''
      last_name = nameParts.slice(1).join(' ') || ''
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        phone: phone || null,
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      
      if (authError.message?.includes('already been registered') || 
          authError.message?.includes('already exists') ||
          authError.status === 422) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: `Failed to create auth account: ${authError.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create auth account' },
        { status: 500 }
      )
    }

    const authUserId = authData.user.id

    const { data: existingUser } = await supabase
      .from('users')
      .select('id, stripe_customer_id, first_name, last_name, phone')
      .eq('email', email)
      .maybeSingle() as { data: { id: number; stripe_customer_id: string | null; first_name: string | null; last_name: string | null; phone: string | null } | null }

    let userId: number
    let stripeCustomerId: string | null = null

    if (existingUser) {
      const updateData = {
        auth_user_id: authUserId,
        first_name: first_name || existingUser.first_name,
        last_name: last_name || existingUser.last_name,
        phone: phone || existingUser.phone,
      }
      
      const { data: updatedUser, error: updateError } = await (supabase
        .from('users') as any)
        .update(updateData)
        .eq('id', existingUser.id)
        .select('id, email, auth_user_id, stripe_customer_id')
        .single() as { data: { id: number; email: string; auth_user_id: string; stripe_customer_id: string | null } | null; error: any }

      if (updateError || !updatedUser) {
        console.error('Error updating user record:', updateError)
        await supabase.auth.admin.deleteUser(authUserId)
        return NextResponse.json(
          { error: `Failed to link account: ${updateError?.message || 'Unknown error'}` },
          { status: 500 }
        )
      }

      userId = updatedUser.id
      stripeCustomerId = updatedUser.stripe_customer_id
    } else {
      const insertData: any = {
        auth_user_id: authUserId,
        email,
        first_name: first_name || null,
        last_name: last_name || null,
        phone: phone || null,
      }

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert(insertData)
        .select('id, email, auth_user_id, stripe_customer_id')
        .single() as { data: { id: number; email: string; auth_user_id: string; stripe_customer_id: string | null } | null; error: any }

      if (insertError || !newUser) {
        console.error('Error creating user record:', insertError)
        await supabase.auth.admin.deleteUser(authUserId)
        return NextResponse.json(
          { error: `Failed to create user account: ${insertError?.message || 'Unknown error'}` },
          { status: 500 }
        )
      }

      userId = newUser.id
      stripeCustomerId = newUser.stripe_customer_id
    }

    if (!stripeCustomerId) {
      try {
        const customer = await stripe.customers.create({
          email,
          name: first_name && last_name ? `${first_name} ${last_name}` : name,
          phone: phone || undefined,
          metadata: {
            user_id: String(userId),
            auth_user_id: authUserId,
          },
        })

        stripeCustomerId = customer.id

        const updateData = { stripe_customer_id: stripeCustomerId }
        await (supabase
          .from('users') as any)
          .update(updateData)
          .eq('id', userId)
      } catch (stripeError: any) {
        console.error('Error creating Stripe customer:', stripeError)
      }
    }

    const { data: finalUser } = await supabase
      .from('users')
      .select('id, email, auth_user_id, first_name, last_name, phone')
      .eq('id', userId)
      .single() as { data: { id: number; email: string; auth_user_id: string; first_name: string | null; last_name: string | null; phone: string | null } | null }

    try {
      await sendWelcomeEmail({
        firstName: finalUser?.first_name || '',
        email: email,
      })
    } catch (emailError: any) {
      console.error('[Signup] Failed to send welcome email (non-blocking):', {
        email,
        error: emailError.message,
      })
    }

    return NextResponse.json(
      {
        user: finalUser,
        message: 'Account created successfully'
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
