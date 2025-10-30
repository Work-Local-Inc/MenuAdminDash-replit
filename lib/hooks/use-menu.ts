"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

// ============================================
// MENU COURSES (CATEGORIES)
// ============================================

export interface MenuCourse {
  id: number
  name: string
  description: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateCourseData {
  restaurant_id: number
  name: string
  description?: string | null
  display_order?: number
  is_active?: boolean
}

export interface UpdateCourseData {
  name?: string
  description?: string | null
  display_order?: number
  is_active?: boolean
}

export function useMenuCourses(restaurantId: number | string) {
  return useQuery<MenuCourse[]>({
    queryKey: ['/api/menu/courses', { restaurant_id: restaurantId }],
    queryFn: async () => {
      const res = await fetch(`/api/menu/courses?restaurant_id=${restaurantId}`)
      if (!res.ok) throw new Error('Failed to fetch courses')
      return res.json()
    },
    enabled: !!restaurantId,
  })
}

export function useCreateCourse() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: CreateCourseData) => {
      const res = await fetch('/api/menu/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create course')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/courses', { restaurant_id: variables.restaurant_id }] 
      })
      toast({
        title: "Success",
        description: "Menu category created successfully",
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

export function useUpdateCourse() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateCourseData }) => {
      const res = await fetch(`/api/menu/courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update course')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu/courses'] })
      toast({
        title: "Success",
        description: "Menu category updated successfully",
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

export function useDeleteCourse() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/menu/courses/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to delete course')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu/courses'] })
      toast({
        title: "Success",
        description: "Menu category deleted successfully",
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

export function useReorderCourses() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ 
      restaurant_id, 
      course_ids 
    }: { 
      restaurant_id: number
      course_ids: number[]
    }) => {
      const res = await fetch('/api/menu/courses/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id, course_ids }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to reorder courses')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/courses', { restaurant_id: variables.restaurant_id }] 
      })
      toast({
        title: "Success",
        description: "Menu categories reordered successfully",
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
// MENU DISHES
// ============================================

export interface MenuDish {
  id: number
  restaurant_id: number
  course_id: number | null
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_active: boolean
  is_featured: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface CreateDishData {
  restaurant_id: number
  course_id?: number | null
  name: string
  description?: string | null
  price: number
  image_url?: string | null
  is_active?: boolean
  is_featured?: boolean
  display_order?: number
}

export interface UpdateDishData {
  course_id?: number | null
  name?: string
  description?: string | null
  price?: number
  image_url?: string | null
  is_active?: boolean
  is_featured?: boolean
  display_order?: number
}

export interface DishFilters {
  restaurant_id: number | string
  course_id?: number | string | 'null'
  is_active?: boolean
}

export function useMenuDishes(filters: DishFilters) {
  const queryParams = new URLSearchParams()
  queryParams.set('restaurant_id', filters.restaurant_id.toString())
  
  if (filters.course_id !== undefined) {
    queryParams.set('course_id', filters.course_id.toString())
  }
  
  if (filters.is_active !== undefined) {
    queryParams.set('is_active', filters.is_active.toString())
  }

  return useQuery<MenuDish[]>({
    queryKey: ['/api/menu/dishes', filters],
    queryFn: async () => {
      const res = await fetch(`/api/menu/dishes?${queryParams}`)
      if (!res.ok) throw new Error('Failed to fetch dishes')
      return res.json()
    },
    enabled: !!filters.restaurant_id,
  })
}

export function useMenuDish(id: number) {
  return useQuery<MenuDish>({
    queryKey: ['/api/menu/dishes', id],
    queryFn: async () => {
      const res = await fetch(`/api/menu/dishes/${id}`)
      if (!res.ok) throw new Error('Failed to fetch dish')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreateDish() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: CreateDishData) => {
      const res = await fetch('/api/menu/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create dish')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/dishes', { restaurant_id: variables.restaurant_id }] 
      })
      queryClient.invalidateQueries({ queryKey: ['/api/menu/dishes'] })
      toast({
        title: "Success",
        description: "Dish created successfully",
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

export function useUpdateDish() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateDishData }) => {
      const res = await fetch(`/api/menu/dishes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update dish')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu/dishes'] })
      toast({
        title: "Success",
        description: "Dish updated successfully",
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

export function useDeleteDish() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/menu/dishes/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to delete dish')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu/dishes'] })
      toast({
        title: "Success",
        description: "Dish deleted successfully",
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
