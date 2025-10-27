"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

interface RestaurantFilters {
  province?: string
  city?: string
  status?: string
  search?: string
}

export function useRestaurants(filters?: RestaurantFilters) {
  const queryParams = new URLSearchParams()
  
  if (filters?.province) queryParams.set('province', filters.province)
  if (filters?.city) queryParams.set('city', filters.city)
  if (filters?.status) queryParams.set('status', filters.status)
  if (filters?.search) queryParams.set('search', filters.search)

  return useQuery({
    queryKey: ['/api/restaurants', 'v2', filters],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants?${queryParams}`)
      if (!res.ok) throw new Error('Failed to fetch restaurants')
      return res.json()
    },
  })
}

export function useRestaurant(id: string) {
  return useQuery({
    queryKey: ['/api/restaurants', id],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${id}`)
      if (!res.ok) throw new Error('Failed to fetch restaurant')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useUpdateRestaurant() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update restaurant')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] })
      toast({
        title: "Success",
        description: "Restaurant updated successfully",
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

export function useDeleteRestaurant() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/restaurants/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete restaurant')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] })
      toast({
        title: "Success",
        description: "Restaurant deleted successfully",
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

export function useToggleOnlineOrdering() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      restaurantId, 
      enabled, 
      reason 
    }: { 
      restaurantId: number
      enabled: boolean
      reason: string
    }) => {
      const res = await fetch('/api/restaurants/toggle-online-ordering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId, enabled, reason }),
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to toggle online ordering')
      }
      
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId.toString()] })
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] })
    },
  })
}
