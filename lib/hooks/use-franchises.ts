"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

// ============================================
// FRANCHISE CHAINS (LIST)
// ============================================

export function useFranchiseChains() {
  return useQuery({
    queryKey: ['/api/franchise/chains'],
    queryFn: async () => {
      const res = await fetch('/api/franchise/chains')
      if (!res.ok) throw new Error('Failed to fetch franchise chains')
      return res.json()
    },
  })
}

// ============================================
// FRANCHISE DETAILS
// ============================================

export function useFranchise(id: string) {
  return useQuery({
    queryKey: ['/api/franchise', id],
    queryFn: async () => {
      const res = await fetch(`/api/franchise/${id}`)
      if (!res.ok) throw new Error('Failed to fetch franchise')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useUpdateFranchise() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/franchise/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update franchise')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/franchise', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['/api/franchise/chains'] })
      toast({
        title: "Success",
        description: "Franchise updated successfully",
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

export function useDeleteFranchise() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/franchise/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete franchise')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/franchise/chains'] })
      toast({
        title: "Success",
        description: "Franchise deleted successfully",
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
// FRANCHISE PARENT CREATION
// ============================================

export function useCreateFranchiseParent() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      name: string
      description?: string
      logo_url?: string
    }) => {
      const res = await fetch('/api/franchise/create-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create franchise parent')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/franchise/chains'] })
      toast({
        title: "Success",
        description: "Franchise parent created successfully",
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
// FRANCHISE CHILDREN LINKING
// ============================================

export function useLinkFranchiseChildren() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      parent_id: number
      child_ids: number[]
    }) => {
      const res = await fetch('/api/franchise/link-children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to link franchise children')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/franchise', variables.parent_id.toString()] })
      queryClient.invalidateQueries({ queryKey: ['/api/franchise/chains'] })
      toast({
        title: "Success",
        description: "Franchise children linked successfully",
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
// FRANCHISE BULK FEATURE UPDATE
// ============================================

export function useBulkFeatureUpdate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      parent_id: number
      feature: string
      value: any
    }) => {
      const res = await fetch('/api/franchise/bulk-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update feature across franchise')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/franchise', variables.parent_id.toString()] })
      queryClient.invalidateQueries({ queryKey: ['/api/franchise/chains'] })
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] })
      toast({
        title: "Success",
        description: "Feature updated across all franchise locations successfully",
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
// FRANCHISE ANALYTICS
// ============================================

export function useFranchiseAnalytics(id: string) {
  return useQuery({
    queryKey: ['/api/franchise', id, 'analytics'],
    queryFn: async () => {
      const res = await fetch(`/api/franchise/${id}/analytics`)
      if (!res.ok) throw new Error('Failed to fetch franchise analytics')
      return res.json()
    },
    enabled: !!id,
  })
}
