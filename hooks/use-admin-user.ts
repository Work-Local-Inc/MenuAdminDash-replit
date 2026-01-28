"use client"

import { useQuery } from '@tanstack/react-query'

export interface AdminUserInfo {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  role_id: number
  auth_user_id: string | null
}

export function useAdminUser() {
  return useQuery<AdminUserInfo | null>({
    queryKey: ['/api/admin-users/me'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/admin-users/me')
        
        if (!response.ok) {
          if (response.status === 401 || response.status === 404) {
            return null
          }
          throw new Error('Failed to fetch admin user')
        }
        
        const data = await response.json()
        
        // Map API response to AdminUserInfo interface
        return {
          id: data.admin_id,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          role_id: data.role_id,
          auth_user_id: null // Not returned from API but not needed
        } as AdminUserInfo
      } catch (error) {
        console.error('[useAdminUser] Error:', error)
        return null
      }
    },
  })
}

export function isSuperAdminRole(roleId: number | undefined | null): boolean {
  return roleId === 1
}

export function isRestaurantAdminRole(roleId: number | undefined | null): boolean {
  return roleId === 2
}
