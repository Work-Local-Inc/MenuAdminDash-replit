"use client"

import { useQuery, useMutation } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { DealWithRestaurant, DealPerformance } from '@/types/promotions'

/**
 * Fetch all promotional deals for admin's authorized restaurants
 */
export function usePromotionalDeals() {
  return useQuery<{ deals: DealWithRestaurant[] }>({
    queryKey: ['/api/admin/promotions/deals'],
  })
}

/**
 * Toggle deal status (enable/disable)
 */
export function useToggleDealStatus() {
  return useMutation({
    mutationFn: async ({ dealId, isEnabled }: { dealId: number; isEnabled: boolean }) => {
      const response = await fetch(`/api/admin/promotions/deals/${dealId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: isEnabled }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to toggle deal status')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions/deals'] })
    },
  })
}

/**
 * Get deal performance stats
 */
export function useDealStats(dealId: number | null) {
  return useQuery<{ stats: DealPerformance | null }>({
    queryKey: ['/api/admin/promotions/deals', dealId, 'stats'],
    enabled: dealId !== null,
  })
}

/**
 * Soft delete a deal
 */
export function useDeleteDeal() {
  return useMutation({
    mutationFn: async (dealId: number) => {
      const response = await fetch(`/api/admin/promotions/deals/${dealId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete deal')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions/deals'] })
    },
  })
}

/**
 * Clone a deal
 */
export function useCloneDeal() {
  return useMutation({
    mutationFn: async (dealId: number) => {
      const response = await fetch(`/api/admin/promotions/deals/${dealId}/clone`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to clone deal')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions/deals'] })
    },
  })
}
