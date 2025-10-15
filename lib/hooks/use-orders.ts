"use client"

import { useQuery } from '@tanstack/react-query'

interface OrderFilters {
  restaurant_id?: string
  status?: string
  limit?: number
}

export function useOrders(filters?: OrderFilters) {
  const queryParams = new URLSearchParams()
  
  if (filters?.restaurant_id) queryParams.set('restaurant_id', filters.restaurant_id)
  if (filters?.status) queryParams.set('status', filters.status)
  if (filters?.limit) queryParams.set('limit', filters.limit.toString())

  return useQuery({
    queryKey: ['/api/orders', filters],
    queryFn: async () => {
      const res = await fetch(`/api/orders?${queryParams}`)
      if (!res.ok) throw new Error('Failed to fetch orders')
      return res.json()
    },
  })
}
