"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Device {
  id: number
  uuid: string
  device_name: string
  restaurant_id: number | null
  restaurant_name?: string
  has_printing_support: boolean
  is_active: boolean
  last_check_at: string | null
  last_boot_at: string | null
  created_at: string
}

interface DeviceFilters {
  restaurant_id?: number
  is_active?: boolean
}

export function useDevices(filters?: DeviceFilters) {
  const queryParams = new URLSearchParams()

  if (filters?.restaurant_id) queryParams.set('restaurant_id', filters.restaurant_id.toString())
  if (filters?.is_active !== undefined) queryParams.set('is_active', filters.is_active.toString())

  return useQuery<Device[]>({
    queryKey: ['/api/admin/devices', filters],
    queryFn: async () => {
      const res = await fetch(`/api/admin/devices?${queryParams}`)
      if (!res.ok) throw new Error('Failed to fetch devices')
      return res.json()
    },
  })
}

export function useDevice(id: number) {
  return useQuery<Device>({
    queryKey: ['/api/admin/devices', id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/devices/${id}`)
      if (!res.ok) throw new Error('Failed to fetch device')
      return res.json()
    },
    enabled: !!id,
  })
}

interface RegisterDeviceInput {
  device_name: string
  restaurant_id: number
  has_printing_support?: boolean
}

interface RegisterDeviceResponse {
  device_id: number
  device_uuid: string
  device_key: string
  qr_code_data: string
  message: string
}

export function useRegisterDevice() {
  const queryClient = useQueryClient()

  return useMutation<RegisterDeviceResponse, Error, RegisterDeviceInput>({
    mutationFn: async (data) => {
      const res = await fetch('/api/tablet/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to register device')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/devices'] })
    },
  })
}

export function useToggleDevice() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { id: number; is_active: boolean }>({
    mutationFn: async ({ id, is_active }) => {
      const res = await fetch(`/api/admin/devices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update device')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/devices'] })
    },
  })
}

export function useDeleteDevice() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/admin/devices/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete device')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/devices'] })
    },
  })
}

interface RegenerateKeyResponse {
  device_id: number
  device_uuid: string
  device_key: string
  qr_code_data: string
  message: string
}

export function useRegenerateDeviceKey() {
  const queryClient = useQueryClient()

  return useMutation<RegenerateKeyResponse, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/admin/devices/${id}/regenerate-key`, {
        method: 'POST',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to regenerate key')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/devices'] })
    },
  })
}
