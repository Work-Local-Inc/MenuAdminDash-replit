import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Check if admin user is a Super Admin (role_id = 1)
 */
async function isSuperAdminById(adminUserId: number): Promise<boolean> {
  const supabase = createAdminClient() as any
  
  const { data, error } = await supabase
    .from('admin_users')
    .select('role_id')
    .eq('id', adminUserId)
    .single()
  
  if (error || !data) {
    return false
  }
  
  // Super Admin has role_id = 1
  return (data as { role_id: number }).role_id === 1
}

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
 * Super Admins have access to all restaurants
 */
export async function verifyRestaurantPermission(
  adminUserId: number,
  restaurantId: number
): Promise<boolean> {
  // Super Admins have access to all restaurants
  const isSuperAdmin = await isSuperAdminById(adminUserId)
  if (isSuperAdmin) {
    return true
  }
  
  // Regular admins need explicit restaurant assignment
  const authorizedIds = await getAdminAuthorizedRestaurants(adminUserId)
  return authorizedIds.includes(restaurantId)
}

/**
 * Get deals for admin's authorized restaurants
 * Super Admins can see all deals; regular admins only see their assigned restaurants
 */
export async function getDealsForAdmin(adminUserId: number) {
  const supabase = createAdminClient()
  
  // Super Admins can see all deals
  const superAdmin = await isSuperAdminById(adminUserId)
  
  if (superAdmin) {
    // Return all deals for super admins
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
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }
    return data
  }
  
  // Regular admins only see deals for their authorized restaurants
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
 * Super Admins can see all coupons; regular admins only see their assigned restaurants
 */
export async function getCouponsForAdmin(adminUserId: number) {
  const supabase = createAdminClient()
  
  // Super Admins can see all coupons
  const superAdmin = await isSuperAdminById(adminUserId)
  
  if (superAdmin) {
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
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }
    return data
  }
  
  // Regular admins only see coupons for their authorized restaurants
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
