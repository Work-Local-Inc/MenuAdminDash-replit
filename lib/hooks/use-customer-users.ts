"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

interface CustomerUserFilters {
  search?: string
  status?: string
  limit?: number
  offset?: number
}

export function useCustomerUsers(filters?: CustomerUserFilters) {
  const queryParams = new URLSearchParams()
  
  if (filters?.search) queryParams.set('search', filters.search)
  if (filters?.status) queryParams.set('status', filters.status)
  if (filters?.limit) queryParams.set('limit', filters.limit.toString())
  if (filters?.offset) queryParams.set('offset', filters.offset.toString())

  return useQuery({
    queryKey: ['/api/users', filters],
    queryFn: async () => {
      const res = await fetch(`/api/users?${queryParams}`)
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json()
    },
  })
}

export function useUserAddresses(userId?: string) {
  return useQuery({
    queryKey: ['/api/users/addresses', userId],
    queryFn: async () => {
      if (!userId) return []
      const res = await fetch(`/api/users/addresses?user_id=${userId}`)
      if (!res.ok) throw new Error('Failed to fetch addresses')
      return res.json()
    },
    enabled: !!userId,
  })
}

export function useUserFavorites(userId?: string) {
  return useQuery({
    queryKey: ['/api/users/favorites', userId],
    queryFn: async () => {
      if (!userId) return []
      const res = await fetch(`/api/users/favorites?user_id=${userId}`)
      if (!res.ok) throw new Error('Failed to fetch favorites')
      return res.json()
    },
    enabled: !!userId,
  })
}
