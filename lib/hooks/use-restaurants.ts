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
  const { toast } = useToast()

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
      toast({
        title: "Success",
        description: `Online ordering ${variables.enabled ? 'enabled' : 'disabled'} successfully`,
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

export function useToggleVerified() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (restaurantId: number) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/toggle-verified`, {
        method: 'POST',
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to toggle verified status')
      }
      
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] })
      toast({
        title: "Success",
        description: `Restaurant ${data.verified ? 'verified' : 'unverified'} successfully`,
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
// RESTAURANT LOCATIONS
// ============================================

export function useRestaurantLocations(restaurantId: string) {
  return useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'locations'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/locations`)
      if (!res.ok) throw new Error('Failed to fetch locations')
      return res.json()
    },
    enabled: !!restaurantId,
  })
}

export function useCreateLocation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, data }: { restaurantId: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create location')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'locations'] })
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId] })
      toast({
        title: "Success",
        description: "Location created successfully",
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

export function useUpdateLocation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, locationId, data }: { restaurantId: string; locationId: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update location')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'locations'] })
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId] })
      toast({
        title: "Success",
        description: "Location updated successfully",
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

export function useDeleteLocation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, locationId }: { restaurantId: string; locationId: string }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/locations/${locationId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete location')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'locations'] })
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId] })
      toast({
        title: "Success",
        description: "Location deleted successfully",
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
// RESTAURANT CONTACTS
// ============================================

export function useRestaurantContacts(restaurantId: string) {
  return useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'contacts'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/contacts`)
      if (!res.ok) throw new Error('Failed to fetch contacts')
      return res.json()
    },
    enabled: !!restaurantId,
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, data }: { restaurantId: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create contact')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'contacts'] })
      toast({
        title: "Success",
        description: "Contact created successfully",
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

export function useUpdateContact() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, contactId, data }: { restaurantId: string; contactId: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update contact')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'contacts'] })
      toast({
        title: "Success",
        description: "Contact updated successfully",
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

export function useDeleteContact() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, contactId }: { restaurantId: string; contactId: string }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/contacts/${contactId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete contact')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'contacts'] })
      toast({
        title: "Success",
        description: "Contact deleted successfully",
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
// RESTAURANT SCHEDULES
// ============================================

export function useRestaurantSchedules(restaurantId: string) {
  return useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'schedules'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/schedules`)
      if (!res.ok) throw new Error('Failed to fetch schedules')
      return res.json()
    },
    enabled: !!restaurantId,
  })
}

export function useCreateSchedule() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, data }: { restaurantId: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create schedule')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'schedules'] })
      toast({
        title: "Success",
        description: "Schedule created successfully",
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

export function useUpdateSchedule() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, scheduleId, data }: { restaurantId: string; scheduleId: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update schedule')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'schedules'] })
      toast({
        title: "Success",
        description: "Schedule updated successfully",
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

export function useDeleteSchedule() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, scheduleId }: { restaurantId: string; scheduleId: string }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/schedules/${scheduleId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete schedule')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'schedules'] })
      toast({
        title: "Success",
        description: "Schedule deleted successfully",
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
// RESTAURANT PAYMENT METHODS
// ============================================

export function useRestaurantPaymentMethods(restaurantId: string) {
  return useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'payment-methods'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/payment-methods`)
      if (!res.ok) throw new Error('Failed to fetch payment methods')
      return res.json()
    },
    enabled: !!restaurantId,
  })
}

export function useCreatePaymentMethod() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, data }: { restaurantId: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/payment-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create payment method')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'payment-methods'] })
      toast({
        title: "Success",
        description: "Payment method created successfully",
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

export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, methodId, data }: { restaurantId: string; methodId: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/payment-methods/${methodId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update payment method')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'payment-methods'] })
      toast({
        title: "Success",
        description: "Payment method updated successfully",
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

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, methodId }: { restaurantId: string; methodId: string }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/payment-methods/${methodId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete payment method')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'payment-methods'] })
      toast({
        title: "Success",
        description: "Payment method deleted successfully",
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
// RESTAURANT IMAGES
// ============================================

export function useRestaurantImages(restaurantId: string) {
  return useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'images'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/images`)
      if (!res.ok) throw new Error('Failed to fetch images')
      return res.json()
    },
    enabled: !!restaurantId,
  })
}

export function useCreateRestaurantImage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, data }: { restaurantId: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to upload image')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'images'] })
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId] })
      toast({
        title: "Success",
        description: "Image uploaded successfully",
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

export function useReorderRestaurantImages() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, imageOrders }: { restaurantId: string; imageOrders: { id: number; display_order: number }[] }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/images/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageOrders }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to reorder images')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'images'] })
      toast({
        title: "Success",
        description: "Image order updated successfully",
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
// RESTAURANT CUISINES
// ============================================

export function useRestaurantCuisines(restaurantId: string) {
  return useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'cuisines'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/cuisines`)
      if (!res.ok) throw new Error('Failed to fetch cuisines')
      return res.json()
    },
    enabled: !!restaurantId,
  })
}

export function useAddRestaurantCuisine() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, cuisineId }: { restaurantId: string; cuisineId: number }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/cuisines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuisine_id: cuisineId }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add cuisine')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'cuisines'] })
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId] })
      toast({
        title: "Success",
        description: "Cuisine added successfully",
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

export function useRemoveRestaurantCuisine() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, cuisineId }: { restaurantId: string; cuisineId: string }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/cuisines/${cuisineId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to remove cuisine')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'cuisines'] })
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId] })
      toast({
        title: "Success",
        description: "Cuisine removed successfully",
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
// RESTAURANT TAGS
// ============================================

export function useRestaurantTags(restaurantId: string) {
  return useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'tags'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/tags`)
      if (!res.ok) throw new Error('Failed to fetch tags')
      return res.json()
    },
    enabled: !!restaurantId,
  })
}

export function useAddRestaurantTag() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, tagId }: { restaurantId: string; tagId: number }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add tag')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'tags'] })
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId] })
      toast({
        title: "Success",
        description: "Tag added successfully",
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

export function useRemoveRestaurantTag() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, tagId }: { restaurantId: string; tagId: string }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/tags/${tagId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to remove tag')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'tags'] })
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId] })
      toast({
        title: "Success",
        description: "Tag removed successfully",
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
// RESTAURANT DELIVERY AREAS
// ============================================

export function useRestaurantDeliveryAreas(restaurantId: string) {
  return useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'delivery-areas'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/delivery-areas`)
      if (!res.ok) throw new Error('Failed to fetch delivery areas')
      return res.json()
    },
    enabled: !!restaurantId,
  })
}

export function useCreateDeliveryArea() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, data }: { restaurantId: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/delivery-areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create delivery area')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'delivery-areas'] })
      toast({
        title: "Success",
        description: "Delivery area created successfully",
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

export function useUpdateDeliveryArea() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, areaId, data }: { restaurantId: string; areaId: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/delivery-areas/${areaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update delivery area')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'delivery-areas'] })
      toast({
        title: "Success",
        description: "Delivery area updated successfully",
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

export function useDeleteDeliveryArea() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, areaId }: { restaurantId: string; areaId: string }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/delivery-areas/${areaId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete delivery area')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'delivery-areas'] })
      toast({
        title: "Success",
        description: "Delivery area deleted successfully",
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
// RESTAURANT SEO
// ============================================

export function useRestaurantSEO(restaurantId: string) {
  return useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'seo'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/seo`)
      if (!res.ok) throw new Error('Failed to fetch SEO data')
      return res.json()
    },
    enabled: !!restaurantId,
  })
}

export function useUpdateRestaurantSEO() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, data }: { restaurantId: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/seo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update SEO')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'seo'] })
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId] })
      toast({
        title: "Success",
        description: "SEO settings updated successfully",
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
// RESTAURANT DOMAINS
// ============================================

export function useRestaurantDomains(restaurantId: string) {
  return useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'domains'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/domains`)
      if (!res.ok) throw new Error('Failed to fetch domains')
      return res.json()
    },
    enabled: !!restaurantId,
  })
}

export function useCreateDomain() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, data }: { restaurantId: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create domain')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'domains'] })
      toast({
        title: "Success",
        description: "Domain created successfully",
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

export function useUpdateDomain() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, domainId, data }: { restaurantId: string; domainId: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/domains/${domainId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update domain')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'domains'] })
      toast({
        title: "Success",
        description: "Domain updated successfully",
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

export function useDeleteDomain() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, domainId }: { restaurantId: string; domainId: string }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/domains/${domainId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete domain')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'domains'] })
      toast({
        title: "Success",
        description: "Domain deleted successfully",
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
// RESTAURANT FEEDBACK
// ============================================

export function useRestaurantFeedback(restaurantId: string) {
  return useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'feedback'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/feedback`)
      if (!res.ok) throw new Error('Failed to fetch feedback')
      return res.json()
    },
    enabled: !!restaurantId,
  })
}

export function useUpdateFeedback() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, feedbackId, data }: { restaurantId: string; feedbackId: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update feedback')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'feedback'] })
      toast({
        title: "Success",
        description: "Feedback updated successfully",
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
// RESTAURANT SERVICE CONFIG
// ============================================

export function useRestaurantServiceConfig(restaurantId: string) {
  return useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'service-config'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/service-config`)
      if (!res.ok) throw new Error('Failed to fetch service config')
      return res.json()
    },
    enabled: !!restaurantId,
  })
}

export function useUpdateServiceConfig() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ restaurantId, data }: { restaurantId: string; data: any }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/service-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update service config')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId, 'service-config'] })
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', variables.restaurantId] })
      toast({
        title: "Success",
        description: "Service configuration updated successfully",
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
