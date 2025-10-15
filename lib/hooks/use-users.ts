"use client"

import { useQuery } from '@tanstack/react-query'

interface UserFilters {
  role?: string
  search?: string
}

export function useUsers(filters?: UserFilters) {
  const queryParams = new URLSearchParams()
  
  if (filters?.role) queryParams.set('role', filters.role)
  if (filters?.search) queryParams.set('search', filters.search)

  return useQuery({
    queryKey: ['/api/users', filters],
    queryFn: async () => {
      const res = await fetch(`/api/users?${queryParams}`)
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json()
    },
  })
}
