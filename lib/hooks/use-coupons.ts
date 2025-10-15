"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

export function useCoupons() {
  return useQuery({
    queryKey: ['/api/coupons'],
    queryFn: async () => {
      const res = await fetch('/api/coupons')
      if (!res.ok) throw new Error('Failed to fetch coupons')
      return res.json()
    },
  })
}

export function useCreateCoupon() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create coupon')
      return res.json()
    },
    onSuccess: () => {
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
