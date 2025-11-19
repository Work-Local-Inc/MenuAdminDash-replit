import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Get admin's authorized restaurant IDs
 * Used server-side in API routes to enforce permissions
 */
export async function getAdminAuthorizedRestaurants(adminUserId: number): Promise<number[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('admin_user_restaurants')
    .select('restaurant_id')
    .eq('admin_user_id', adminUserId)

  if (error) {
    throw error
  }

  return (data as { restaurant_id: number }[] | null)?.map(p => p.restaurant_id) || []
}

/**
 * Verify admin has permission for a specific restaurant
 */
export async function verifyRestaurantPermission(
  adminUserId: number,
  restaurantId: number
): Promise<boolean> {
  const authorizedIds = await getAdminAuthorizedRestaurants(adminUserId)
  return authorizedIds.includes(restaurantId)
}

/**
 * Get deals for admin's authorized restaurants
 */
export async function getDealsForAdmin(adminUserId: number) {
  const supabase = createAdminClient()
  const authorizedIds = await getAdminAuthorizedRestaurants(adminUserId)

  if (authorizedIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('promotional_deals')
    .select(`
      *,
      restaurants:restaurant_id (
        id,
        name,
        slug
      )
    `)
    .in('restaurant_id', authorizedIds)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

/**
 * Get coupons for admin's authorized restaurants
 */
export async function getCouponsForAdmin(adminUserId: number) {
  const supabase = createAdminClient()
  const authorizedIds = await getAdminAuthorizedRestaurants(adminUserId)

  if (authorizedIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('promotional_coupons')
    .select(`
      *,
      restaurants:restaurant_id (
        id,
        name,
        slug
      )
    `)
    .in('restaurant_id', authorizedIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}
