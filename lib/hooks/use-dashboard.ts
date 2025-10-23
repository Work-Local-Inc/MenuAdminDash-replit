"use client"

import { useQuery } from '@tanstack/react-query'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      console.log('Fetching dashboard stats...')
      try {
        const res = await fetch('/api/dashboard/stats')
        console.log('Dashboard stats response:', res.status, res.ok)
        if (!res.ok) {
          const error = await res.text()
          console.error('Dashboard stats error:', error)
          throw new Error('Failed to fetch dashboard stats')
        }
        const data = await res.json()
        console.log('Dashboard stats data:', data)
        return data
      } catch (error) {
        console.error('Dashboard stats fetch error:', error)
        throw error
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

export function useRecentOrders(limit: number = 10) {
  return useQuery({
    queryKey: ['/api/orders', { limit }],
    queryFn: async () => {
      const res = await fetch(`/api/orders?limit=${limit}`)
      if (!res.ok) throw new Error('Failed to fetch orders')
      return res.json()
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  })
}

export function useRevenueHistory(timeRange: 'daily' | 'weekly' | 'monthly') {
  return useQuery({
    queryKey: ['/api/dashboard/revenue', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/revenue?timeRange=${timeRange}`)
      if (!res.ok) throw new Error('Failed to fetch revenue history')
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}
