"use client"

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface AdminUserInfo {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  role_id: number
  auth_user_id: string | null
}

export function useAdminUser() {
  const supabase = createClient()

  return useQuery<AdminUserInfo | null>({
    queryKey: ['/api/admin/current-user'],
    queryFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return null
      }

      const { data: authIdMatch } = await supabase
        .from('admin_users')
        .select('id, email, first_name, last_name, role_id, auth_user_id')
        .eq('auth_user_id', user.id)
        .is('deleted_at', null)
        .single()

      if (authIdMatch) {
        return authIdMatch as AdminUserInfo
      }

      if (user.email) {
        const { data: emailMatch } = await supabase
          .from('admin_users')
          .select('id, email, first_name, last_name, role_id, auth_user_id')
          .eq('email', user.email)
          .is('deleted_at', null)
          .single()
        
        return emailMatch as AdminUserInfo | null
      }

      return null
    },
  })
}

export function isSuperAdminRole(roleId: number | undefined | null): boolean {
  return roleId === 1
}

export function isRestaurantAdminRole(roleId: number | undefined | null): boolean {
  return roleId === 2
}
