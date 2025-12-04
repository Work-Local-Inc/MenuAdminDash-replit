"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

// Fetch coupons - REQUIRES restaurant_id for multi-tenancy security
// Will not fetch until a valid restaurant ID is provided
export function useCoupons(restaurantId?: string | number) {
  const id = restaurantId ? String(restaurantId) : null
  
  return useQuery({
    queryKey: ['/api/coupons', { restaurant: id }],
    queryFn: async () => {
      if (!id) {
        return [] // Never fetch without restaurant context
      }
      const res = await fetch(`/api/coupons?restaurant=${id}`)
      if (!res.ok) throw new Error('Failed to fetch coupons')
      return res.json()
    },
    enabled: !!id, // Only fetch when restaurant ID is provided
  })
}

export function useCreateCoupon(restaurantId?: string | number) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const id = restaurantId ? Number(restaurantId) : null

  return useMutation({
    mutationFn: async (data: any) => {
      if (!id) {
        throw new Error('Restaurant ID is required to create a coupon')
      }
      
      // Transform form data to match database column names
      // Coupons are ALWAYS restaurant-specific (no global coupons)
      const payload = {
        code: data.code,
        name: data.name || data.code, // Use code as name if not provided
        description: data.description || null,
        discount_type: data.discount_type,
        discount_amount: data.discount_amount,
        minimum_purchase: data.minimum_purchase || null,
        max_redemptions: data.max_redemptions || null,
        valid_until_at: data.valid_until_at || null,
        valid_from_at: data.valid_from_at || null,
        restaurant_id: id, // Always required - location-specific only
        is_active: true,
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
