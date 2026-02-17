import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

// Use production Stripe keys if available, fall back to test keys
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.TESTING_STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error('Missing required Stripe secret key')
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover',
})

export interface OAuthProfileInput {
  authUserId: string
  email: string
  emailVerified: boolean // SECURITY: Require email verification
  firstName?: string
  lastName?: string
  phone?: string | null
}

export interface OAuthProfileResult {
  success: boolean
  userId?: number
  error?: string
}

/**
 * Ensures an OAuth profile exists for the given session user.
 * Enforces strict email ownership and prevents account takeover.
 * 
 * Security checks (in order):
 * 1. Require verified email
 * 2. Fetch all rows by email
 * 3. If any row has different auth_user_id, reject
 * 4. If row with null auth_user_id exists, upgrade it
 * 5. Otherwise, create new record
 * 6. Create Stripe customer if needed
 */
export async function ensureOAuthProfileForSession(
  input: OAuthProfileInput
): Promise<OAuthProfileResult> {
  const { authUserId, email, emailVerified, firstName, lastName, phone } = input

  // SECURITY: Require verified email
  if (!email) {
    return { success: false, error: 'Email is required' }
  }

  // SECURITY: Reject unverified emails to prevent account takeover
  if (!emailVerified) {
    return { success: false, error: 'Email must be verified' }
  }

  const supabase = createAdminClient()

  try {
    // Check if user already exists by auth_user_id
    const { data: existingUserByAuth } = await supabase
      .from('users')
      .select('id, email, stripe_customer_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle() as { data: { id: number; email: string; stripe_customer_id: string | null } | null }

    if (existingUserByAuth) {
      // User already has a profile - return success
      console.log('[OAuth Profile] User already exists:', existingUserByAuth.id)
      return { success: true, userId: existingUserByAuth.id }
    }

    // SECURITY: Fetch all rows with this email to check for conflicts
    const { data: usersWithEmail } = await supabase
      .from('users')
      .select('id, auth_user_id, stripe_customer_id, first_name, last_name, phone')
      .eq('email', email) as { data: { id: number; auth_user_id: string | null; stripe_customer_id: string | null; first_name: string | null; last_name: string | null; phone: string | null }[] | null }

    // SECURITY: Reject if any row has a different (non-null) auth_user_id
    if (usersWithEmail && usersWithEmail.length > 0) {
      const hasConflict = usersWithEmail.some(
        u => u.auth_user_id !== null && u.auth_user_id !== authUserId
      )
      if (hasConflict) {
        console.error('[OAuth Profile] Email already associated with different authenticated account')
        return { success: false, error: 'Email already associated with another account' }
      }

      // Find guest account to upgrade (auth_user_id is null)
      const guestAccount = usersWithEmail.find(u => u.auth_user_id === null)
      
      if (guestAccount) {
        // SECURITY: Upgrade guest account to authenticated account
        console.log('[OAuth Profile] Upgrading guest account:', guestAccount.id)
        
        const updateData = {
          auth_user_id: authUserId,
          first_name: firstName || guestAccount.first_name,
          last_name: lastName || guestAccount.last_name,
          phone: phone || guestAccount.phone,
        }
        
        const { data: updatedUser, error: updateError } = await (supabase
          .from('users') as any)
          .update(updateData)
          .eq('id', guestAccount.id)
          .select('id, stripe_customer_id')
          .single() as { data: { id: number; stripe_customer_id: string | null } | null; error: any }

        if (updateError || !updatedUser) {
          console.error('[OAuth Profile] Error upgrading guest account:', updateError)
          return { success: false, error: 'Failed to upgrade guest account' }
        }

        // Create Stripe customer if needed
        await ensureStripeCustomer(updatedUser.id, authUserId, email, firstName, lastName, phone, updatedUser.stripe_customer_id)

        return { success: true, userId: updatedUser.id }
      }
    }

    // No existing user - create new record
    console.log('[OAuth Profile] Creating new user record for:', email)
    
    const insertData: any = {
      auth_user_id: authUserId,
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phone || null,
    }

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert(insertData)
      .select('id, stripe_customer_id')
      .single() as { data: { id: number; stripe_customer_id: string | null } | null; error: any }

    if (insertError || !newUser) {
      console.error('[OAuth Profile] Error creating user record:', insertError)
      return { success: false, error: 'Failed to create user account' }
    }

    // Create Stripe customer if needed
    await ensureStripeCustomer(newUser.id, authUserId, email, firstName, lastName, phone, newUser.stripe_customer_id)

    return { success: true, userId: newUser.id }
  } catch (error: any) {
    console.error('[OAuth Profile] Exception:', error)
    return { success: false, error: error.message || 'Internal error' }
  }
}

/**
 * Ensures a Stripe customer exists for the user
 * Non-blocking - logs errors but doesn't fail the operation
 */
async function ensureStripeCustomer(
  userId: number,
  authUserId: string,
  email: string,
  firstName?: string,
  lastName?: string,
  phone?: string | null,
  existingStripeId?: string | null
): Promise<void> {
  if (existingStripeId) {
    return // Already has Stripe customer
  }

  try {
    const customerName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || undefined
    
    const customer = await stripe.customers.create({
      email,
      name: customerName,
      phone: phone || undefined,
      metadata: {
        user_id: String(userId),
        auth_user_id: authUserId,
      },
    })

    const supabase = createAdminClient()
    await (supabase
      .from('users') as any)
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId)

    console.log('[OAuth Profile] Created Stripe customer:', customer.id)
  } catch (stripeError: any) {
    console.error('[OAuth Profile] Error creating Stripe customer (non-blocking):', stripeError)
    // Non-blocking - don't fail the operation
  }
}
