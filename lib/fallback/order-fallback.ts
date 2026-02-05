import { createAdminClient } from '@/lib/supabase/admin'

export type CallPhoneResult = {
  phone: string | null
  source: 'twilio_config' | 'admin_user' | 'location' | 'disabled' | 'missing'
}

export async function getRestaurantCallPhone(restaurantId: number): Promise<CallPhoneResult> {
  const supabase = createAdminClient() as any

  const { data: twilioConfig, error: twilioError } = await supabase
    .from('restaurant_twilio_config')
    .select('phone, enables_calls')
    .eq('restaurant_id', restaurantId)
    .maybeSingle()

  if (twilioError) {
    console.warn('[Order Fallback] Failed to fetch restaurant_twilio_config:', twilioError)
  }

  if (twilioConfig?.enables_calls === false) {
    return { phone: null, source: 'disabled' }
  }

  if (twilioConfig?.enables_calls && twilioConfig?.phone) {
    return { phone: twilioConfig.phone, source: 'twilio_config' }
  }

  const { data: adminLinks, error: adminError } = await supabase
    .from('admin_user_restaurants')
    .select(`
      id,
      created_at,
      admin_user:admin_users (
        id,
        first_name,
        last_name,
        phone,
        email,
        is_active
      )
    `)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: true })
    .limit(5)

  if (adminError) {
    console.warn('[Order Fallback] Failed to fetch admin_user_restaurants:', adminError)
  }

  if (adminLinks && adminLinks.length > 0) {
    const adminWithPhone = adminLinks.find((link: any) => link.admin_user?.is_active && link.admin_user?.phone)
    if (adminWithPhone?.admin_user?.phone) {
      return { phone: adminWithPhone.admin_user.phone, source: 'admin_user' }
    }
  }

  const { data: primaryLocation, error: primaryError } = await supabase
    .from('restaurant_locations')
    .select('phone, is_primary')
    .eq('restaurant_id', restaurantId)
    .eq('is_primary', true)
    .maybeSingle()

  if (primaryError) {
    console.warn('[Order Fallback] Failed to fetch primary location phone:', primaryError)
  }

  if (primaryLocation?.phone) {
    return { phone: primaryLocation.phone, source: 'location' }
  }

  const { data: anyLocation, error: locationError } = await supabase
    .from('restaurant_locations')
    .select('phone')
    .eq('restaurant_id', restaurantId)
    .not('phone', 'is', null)
    .limit(1)
    .maybeSingle()

  if (locationError) {
    console.warn('[Order Fallback] Failed to fetch fallback location phone:', locationError)
  }

  if (anyLocation?.phone) {
    return { phone: anyLocation.phone, source: 'location' }
  }

  return { phone: null, source: 'missing' }
}

export async function wasOrderFallbackCalled(orderId: number): Promise<boolean> {
  const supabase = createAdminClient() as any

  const { data, error } = await supabase
    .from('order_status_history')
    .select('id')
    .eq('order_id', orderId)
    .ilike('notes', '%Twilio fallback call%')
    .limit(1)

  if (error) {
    console.warn('[Order Fallback] Failed to query order_status_history:', error)
    return false
  }

  return Array.isArray(data) && data.length > 0
}

export async function recordFallbackCallAttempt(params: {
  orderId: number
  orderCreatedAt: string
  orderStatus: string
  notes: string
}) {
  const supabase = createAdminClient() as any

  const { error } = await supabase
    .from('order_status_history')
    .insert({
      order_id: params.orderId,
      order_created_at: params.orderCreatedAt,
      status: params.orderStatus,
      notes: params.notes,
    })

  if (error) {
    console.warn('[Order Fallback] Failed to record fallback call attempt:', error)
  }
}
