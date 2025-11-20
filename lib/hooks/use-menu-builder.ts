"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

// ============================================
// TYPES
// ============================================

export interface MenuBuilderCategory {
  id: number
  name: string
  description: string | null
  display_order: number
  is_active: boolean
  templates: CategoryModifierTemplate[]
  dishes: MenuBuilderDish[]
}

export interface MenuBuilderDish {
  id: number
  course_id: number | null
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_active: boolean
  is_featured: boolean
  display_order: number
  modifier_groups: DishModifierGroup[]
}

export interface CategoryModifierTemplate {
  id: number
  course_id: number
  name: string
  is_required: boolean
  min_selections: number
  max_selections: number
  display_order: number
  course_template_modifiers: TemplateModifier[]
}

export interface TemplateModifier {
  id: number
  template_id?: number
  name: string
  price: number
  is_included: boolean
  display_order: number
}

export interface DishModifierGroup {
  id: number
  dish_id: number
  course_template_id: number | null
  name: string
  is_required: boolean
  min_selections: number
  max_selections: number
  display_order: number
  is_custom: boolean
  dish_modifiers: DishModifier[]
}

export interface DishModifier {
  id: number
  modifier_group_id?: number
  name: string
  price: number
  is_included: boolean
  is_default: boolean
  display_order: number
}

export interface CreateTemplateData {
  course_id: number
  name: string
  is_required?: boolean
  min_selections?: number
  max_selections?: number
  modifiers: {
    name: string
    price: number
    is_included?: boolean
  }[]
}

export interface UpdateTemplateData {
  name?: string
  is_required?: boolean
  min_selections?: number
  max_selections?: number
  modifiers?: {
    name: string
    price: number
    is_included?: boolean
  }[]
}

export interface ApplyTemplateData {
  dish_ids?: number[]
  course_id?: number
  template_id: number
}

// ============================================
// HOOKS
// ============================================

export function useMenuBuilder(restaurantId: number | string | null) {
  return useQuery<MenuBuilderCategory[]>({
    queryKey: ['/api/menu/builder', { restaurant_id: restaurantId }],
    queryFn: async () => {
      const res = await fetch(`/api/menu/builder?restaurant_id=${restaurantId}`)
      if (!res.ok) throw new Error('Failed to fetch menu builder data')
      return res.json()
    },
    // ISSUE 1 FIX: Only enable when restaurantId is valid (not 0, null, or empty)
    enabled: !!restaurantId && (typeof restaurantId === 'number' ? restaurantId > 0 : parseInt(restaurantId) > 0),
  })
}

export function useCreateCategoryTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      const res = await fetch('/api/menu/category-modifier-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create template')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/builder'] 
      })
      toast({
        title: "Success",
        description: "Modifier template created successfully",
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

export function useUpdateCategoryTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTemplateData }) => {
      const res = await fetch(`/api/menu/category-modifier-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update template')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/builder'] 
      })
      toast({
        title: "Success",
        description: "Modifier template updated successfully",
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

export function useDeleteCategoryTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/menu/category-modifier-templates/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to delete template')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/builder'] 
      })
      toast({
        title: "Success",
        description: "Modifier template deleted successfully",
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

export function useApplyTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: ApplyTemplateData) => {
      const res = await fetch('/api/menu/apply-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to apply template')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/builder'] 
      })
      toast({
        title: "Success",
        description: `Template applied to ${data.dishes_updated} dish(es)`,
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

export function useBreakInheritance() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (dishId: number) => {
      const res = await fetch('/api/menu/break-inheritance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dish_id: dishId }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to break inheritance')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/builder'] 
      })
      toast({
        title: "Success",
        description: "Modifier inheritance broken - dish now has custom modifiers",
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

export function useReorderMenuItems() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      restaurant_id: number
      category_ids?: number[]
      dish_ids?: number[]
      template_ids?: number[]
    }) => {
      const res = await fetch('/api/menu/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to reorder items')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/builder'] 
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
