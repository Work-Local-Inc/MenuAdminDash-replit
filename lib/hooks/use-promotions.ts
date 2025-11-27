"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

// ============================================
// DEALS
// ============================================

interface DealsFilters {
  restaurant_id?: number
  is_enabled?: boolean
}

export function useDeals(filters?: DealsFilters) {
  const queryParams = new URLSearchParams()
  if (filters?.restaurant_id) queryParams.set('restaurant_id', filters.restaurant_id.toString())
  if (filters?.is_enabled !== undefined) queryParams.set('is_enabled', filters.is_enabled.toString())

  return useQuery({
    queryKey: ['/api/admin/promotions/deals', filters],
    queryFn: async () => {
      const res = await fetch(`/api/admin/promotions/deals?${queryParams}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch deals')
      }
      const data = await res.json()
      return data.deals || []
    },
  })
}

export function useCreateDeal() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/promotions/deals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create deal')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions/deals'] })
      toast({
        title: "Success",
        description: "Deal created successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    },
  })
}

export function useUpdateDeal() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/admin/promotions/deals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update deal')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions/deals'] })
      toast({
        title: "Success",
        description: "Deal updated successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    },
  })
}

export function useToggleDeal() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: number; is_enabled: boolean }) => {
      const res = await fetch(`/api/admin/promotions/deals/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to toggle deal')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions/deals'] })
      toast({
        title: "Success",
        description: `Deal ${variables.is_enabled ? 'enabled' : 'disabled'} successfully`,
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    },
  })
}

export function useDeleteDeal() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/promotions/deals/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete deal')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions/deals'] })
      toast({
        title: "Success",
        description: "Deal deleted successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    },
  })
}

// ============================================
// UPSELLS
// ============================================

interface UpsellsFilters {
  restaurant_id?: number
  is_active?: boolean
}

export function useUpsells(filters?: UpsellsFilters) {
  const queryParams = new URLSearchParams()
  if (filters?.restaurant_id) queryParams.set('restaurant_id', filters.restaurant_id.toString())
  if (filters?.is_active !== undefined) queryParams.set('is_active', filters.is_active.toString())

  return useQuery({
    queryKey: ['/api/admin/promotions/upsells', filters],
    queryFn: async () => {
      const res = await fetch(`/api/admin/promotions/upsells?${queryParams}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch upsells')
      }
      const data = await res.json()
      return data.upsells || []
    },
  })
}

export function useCreateUpsell() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/promotions/upsells', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create upsell')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions/upsells'] })
      toast({
        title: "Success",
        description: "Upsell rule created successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    },
  })
}

export function useUpdateUpsell() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/admin/promotions/upsells/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update upsell')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions/upsells'] })
      toast({
        title: "Success",
        description: "Upsell rule updated successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    },
  })
}

export function useToggleUpsell() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const res = await fetch(`/api/admin/promotions/upsells/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to toggle upsell')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions/upsells'] })
      toast({
        title: "Success",
        description: `Upsell ${variables.is_active ? 'enabled' : 'disabled'} successfully`,
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    },
  })
}

export function useDeleteUpsell() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/promotions/upsells/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete upsell')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions/upsells'] })
      toast({
        title: "Success",
        description: "Upsell rule deleted successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    },
  })
}

// ============================================
// ANALYTICS
// ============================================

interface AnalyticsFilters {
  restaurant_id?: number
  start_date?: string
  end_date?: string
}

export function usePromotionAnalytics(filters?: AnalyticsFilters) {
  const queryParams = new URLSearchParams()
  if (filters?.restaurant_id) queryParams.set('restaurant_id', filters.restaurant_id.toString())
  if (filters?.start_date) queryParams.set('start_date', filters.start_date)
  if (filters?.end_date) queryParams.set('end_date', filters.end_date)

  return useQuery({
    queryKey: ['/api/admin/promotions/analytics', filters],
    queryFn: async () => {
      const res = await fetch(`/api/admin/promotions/analytics?${queryParams}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch analytics')
      }
      return res.json()
    },
    enabled: !!filters?.restaurant_id,
  })
}

// ============================================
// STATS (for Marketing Hub dashboard)
// ============================================

export function usePromotionStats(restaurantId?: number) {
  return useQuery({
    queryKey: ['/api/admin/promotions/stats', restaurantId],
    queryFn: async () => {
      const params = restaurantId ? `?restaurant_id=${restaurantId}` : ''
      const res = await fetch(`/api/admin/promotions/stats${params}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch stats')
      }
      return res.json()
    },
    enabled: !!restaurantId,
  })
}

// ============================================
// ACTIVE PROMOTIONS (combined view)
// ============================================

export function useActivePromotions(restaurantId?: number) {
  return useQuery({
    queryKey: ['/api/admin/promotions/active', restaurantId],
    queryFn: async () => {
      const params = restaurantId ? `?restaurant_id=${restaurantId}` : ''
      const res = await fetch(`/api/admin/promotions/active${params}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch active promotions')
      }
      return res.json()
    },
    enabled: !!restaurantId,
  })
}

