"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

// ============================================
// ONBOARDING DASHBOARD & STATS
// ============================================

export function useOnboardingDashboard() {
  return useQuery({
    queryKey: ['/api/onboarding/dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/onboarding/dashboard')
      if (!res.ok) throw new Error('Failed to fetch onboarding dashboard')
      return res.json()
    },
  })
}

export function useOnboardingStats() {
  return useQuery({
    queryKey: ['/api/onboarding/stats'],
    queryFn: async () => {
      const res = await fetch('/api/onboarding/stats')
      if (!res.ok) throw new Error('Failed to fetch onboarding stats')
      return res.json()
    },
  })
}

export function useOnboardingSummary() {
  return useQuery({
    queryKey: ['/api/onboarding/summary'],
    queryFn: async () => {
      const res = await fetch('/api/onboarding/summary')
      if (!res.ok) throw new Error('Failed to fetch onboarding summary')
      return res.json()
    },
  })
}

export function useIncompleteOnboarding() {
  return useQuery({
    queryKey: ['/api/onboarding/incomplete'],
    queryFn: async () => {
      const res = await fetch('/api/onboarding/incomplete')
      if (!res.ok) throw new Error('Failed to fetch incomplete onboarding')
      return res.json()
    },
  })
}

// ============================================
// ONBOARDING ACTIONS
// ============================================

export function useCreateRestaurantOnboarding() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/onboarding/create-restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create restaurant')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/incomplete'] })
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] })
      toast({
        title: "Success",
        description: "Restaurant created successfully",
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

export function useAddOnboardingContact() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      restaurant_id: number
      name: string
      email?: string
      phone?: string
      role?: string
    }) => {
      const res = await fetch('/api/onboarding/add-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add contact')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/dashboard'] })
      toast({
        title: "Success",
        description: "Contact added successfully",
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

export function useAddOnboardingLocation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      restaurant_id: number
      address: string
      city: string
      province: string
      postal_code: string
      latitude?: number
      longitude?: number
    }) => {
      const res = await fetch('/api/onboarding/add-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add location')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/dashboard'] })
      toast({
        title: "Success",
        description: "Location added successfully",
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

export function useCreateOnboardingDeliveryZone() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      restaurant_id: number
      zone_name: string
      geometry: any
      delivery_fee?: number
      minimum_order?: number
    }) => {
      const res = await fetch('/api/onboarding/create-delivery-zone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create delivery zone')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/dashboard'] })
      toast({
        title: "Success",
        description: "Delivery zone created successfully",
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

export function useApplyScheduleTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      restaurant_id: number
      template_name: string
    }) => {
      const res = await fetch('/api/onboarding/apply-schedule-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to apply schedule template')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/dashboard'] })
      toast({
        title: "Success",
        description: "Schedule template applied successfully",
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

export function useAddMenuItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      restaurant_id: number
      category_id: number
      name: string
      description?: string
      price: number
    }) => {
      const res = await fetch('/api/onboarding/add-menu-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add menu item')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/dashboard'] })
      toast({
        title: "Success",
        description: "Menu item added successfully",
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

export function useCopyFranchiseMenu() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      source_restaurant_id: number
      target_restaurant_id: number
    }) => {
      const res = await fetch('/api/onboarding/copy-franchise-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to copy franchise menu')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/dashboard'] })
      toast({
        title: "Success",
        description: "Franchise menu copied successfully",
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

export function useCompleteOnboarding() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      restaurant_id: number
    }) => {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to complete onboarding')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/incomplete'] })
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/stats'] })
      toast({
        title: "Success",
        description: "Restaurant onboarding completed successfully!",
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
