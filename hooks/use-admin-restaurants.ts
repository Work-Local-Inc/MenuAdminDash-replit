"use client"

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

/**
 * Fetches the list of restaurant IDs that the current admin user has permission to manage
 * Used to scope all promotional queries to authorized restaurants only
 * 
 * Uses auth_user_id for lookup (more secure than email matching)
 * Falls back to email for backwards compatibility with existing admins
 */
export function useAdminRestaurants() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['/api/admin/authorized-restaurants'],
    queryFn: async () => {
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Try to get admin user record by auth_user_id first (preferred)
      let adminUser = null
      
      const { data: authIdMatch } = await supabase
        .from('admin_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .is('deleted_at', null)
        .single<{ id: number }>()

      if (authIdMatch) {
        adminUser = authIdMatch
      } else if (user.email) {
        // Fallback to email for backwards compatibility
        const { data: emailMatch } = await supabase
          .from('admin_users')
          .select('id')
          .eq('email', user.email)
          .is('deleted_at', null)
          .single<{ id: number }>()
        
        adminUser = emailMatch
      }

      if (!adminUser) {
        throw new Error('Admin user not found')
      }

      // Get authorized restaurant IDs
      const { data: permissions, error: permError } = await supabase
        .from('admin_user_restaurants')
        .select('restaurant_id')
        .eq('admin_user_id', adminUser.id)

      if (permError) {
        throw permError
      }

      return (permissions as { restaurant_id: number }[] | null)?.map(p => p.restaurant_id) || []
    },
  })
}
