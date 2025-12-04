"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

// Fetch coupons - optionally filtered by restaurant_id for multi-tenancy
export function useCoupons(restaurantId?: string | number) {
  const id = restaurantId ? String(restaurantId) : null
  
  return useQuery({
    queryKey: ['/api/coupons', { restaurant: id }],
    queryFn: async () => {
      const url = id ? `/api/coupons?restaurant=${id}` : '/api/coupons'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch coupons')
      return res.json()
    },
  })
}

export function useCreateCoupon(restaurantId?: string | number) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const id = restaurantId ? String(restaurantId) : null

  return useMutation({
    mutationFn: async (data: any) => {
      // Always include restaurant_id if provided (for restaurant-specific coupons)
      const payload = {
        ...data,
        restaurant_id: data.is_global ? null : (data.restaurant_id || restaurantId),
      }
      
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create coupon')
      }
      return res.json()
    },
    onSuccess: () => {
      // Invalidate both filtered and unfiltered queries
      queryClient.invalidateQueries({ queryKey: ['/api/coupons'] })
      toast({
        title: "Success",
        description: "Coupon created successfully",
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
