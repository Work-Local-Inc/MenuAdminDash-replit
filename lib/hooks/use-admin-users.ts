"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

interface AdminUserFilters {
  search?: string
  role_id?: string
  status?: string
  limit?: number
  offset?: number
}

export function useAdminUsers(filters?: AdminUserFilters) {
  const queryParams = new URLSearchParams()
  
  if (filters?.search) queryParams.set('search', filters.search)
  if (filters?.role_id) queryParams.set('role_id', filters.role_id)
  if (filters?.status) queryParams.set('status', filters.status)
  if (filters?.limit) queryParams.set('limit', filters.limit.toString())
  if (filters?.offset) queryParams.set('offset', filters.offset.toString())

  return useQuery({
    queryKey: ['/api/admin-users', filters],
    queryFn: async () => {
      const res = await fetch(`/api/admin-users?${queryParams}`)
      if (!res.ok) throw new Error('Failed to fetch admin users')
      return res.json()
    },
  })
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: ['/api/admin-users', id],
    queryFn: async () => {
      const res = await fetch(`/api/admin-users/${id}`)
      if (!res.ok) throw new Error('Failed to fetch admin user')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useMyAdminInfo() {
  return useQuery({
    queryKey: ['/api/admin-users/me'],
    queryFn: async () => {
      const res = await fetch('/api/admin-users/me')
      if (!res.ok) throw new Error('Failed to fetch admin info')
      return res.json()
    },
  })
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      email: string
      first_name: string
      last_name: string
      phone?: string
      role_id: number
    }) => {
      const res = await fetch('/api/admin-users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create admin user')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin-users'] })
      toast({
        title: "Success",
        description: "Admin user request created successfully. Follow manual steps to complete setup.",
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

export function useAssignRestaurants() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      admin_user_id: number
      restaurant_ids: number[]
      action: 'add' | 'remove' | 'replace'
    }) => {
      const res = await fetch('/api/admin-users/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to assign restaurants')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['/api/admin-users', variables.admin_user_id.toString()] })
      toast({
        title: "Success",
        description: "Restaurant assignments updated successfully",
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

export function useUpdateAdminUser() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin-users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update admin user')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin-users'] })
      toast({
        title: "Success",
        description: "Admin user updated successfully",
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

export function useDeleteAdminUser() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin-users/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete admin user')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin-users'] })
      toast({
        title: "Success",
        description: "Admin user deleted successfully",
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
