"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { apiRequest } from '@/lib/queryClient'

// ============================================
// TYPES
// ============================================

export interface MenuBuilderCategory {
  id: number
  name: string
  description: string | null
  display_order: number
  is_active: boolean
  modifier_groups: CategoryModifierGroup[]
  dishes: MenuBuilderDish[]
}

export interface DishPrice {
  id: number
  price: number
  size_variant: string | null
  display_order: number
  is_active: boolean
}

export interface MenuBuilderDish {
  id: number
  course_id: number | null
  name: string
  description: string | null
  price: number // Computed from first dish_price
  dish_prices?: DishPrice[] // Array of all price variants
  image_url: string | null
  is_active: boolean
  is_featured?: boolean // Optional - column doesn't exist in menuca_v3.dishes
  display_order: number
  modifier_groups: DishModifierGroup[]
}

export interface CategoryModifierGroup {
  id: number
  course_id: number
  name: string
  is_required: boolean
  min_selections: number
  max_selections: number
  display_order: number
  modifier_options: ModifierOption[]
}

export interface ModifierOption {
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

export interface CreateModifierGroupData {
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

export interface UpdateModifierGroupData {
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

export interface ApplyModifierGroupData {
  dish_ids?: number[]
  course_id?: number
  template_id: number
}

// ============================================
// NOTE: Database uses legacy column names
// ============================================
// Database columns still use: course_modifier_templates, course_template_modifiers
// Code now consistently uses: modifier_groups, modifier_options
// The API layer handles the translation between database and code terminology

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

export function useCreateCategoryModifierGroup() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: CreateModifierGroupData) => {
      const res = await fetch('/api/menu/category-modifier-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create modifier group')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/builder'] 
      })
      queryClient.invalidateQueries({
        queryKey: ['/api/menu/modifier-groups']
      })
      toast({
        title: "Success",
        description: "Modifier group created successfully",
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

export function useUpdateCategoryModifierGroup() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateModifierGroupData }) => {
      const res = await fetch(`/api/menu/category-modifier-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update modifier group')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/builder'] 
      })
      queryClient.invalidateQueries({
        queryKey: ['/api/menu/modifier-groups']
      })
      toast({
        title: "Success",
        description: "Modifier group updated successfully",
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

export function useDeleteCategoryModifierGroup() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/menu/category-modifier-templates/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to delete modifier group')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/builder'] 
      })
      queryClient.invalidateQueries({
        queryKey: ['/api/menu/modifier-groups']
      })
      toast({
        title: "Success",
        description: "Modifier group deleted successfully",
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

export interface RestaurantModifierGroup {
  id: number
  name: string
  is_required: boolean
  min_selections: number
  max_selections: number
  display_order: number
  created_at?: string
  modifiers: ModifierOption[]
}

export function useRestaurantModifierGroups(restaurantId?: string | number) {
  return useQuery<RestaurantModifierGroup[]>({
    queryKey: ['/api/menu/modifier-groups', restaurantId],
    enabled: !!restaurantId, // Only run query if restaurant ID is provided
    queryFn: async () => {
      if (!restaurantId) {
        throw new Error('Restaurant ID is required')
      }
      const res = await fetch(`/api/menu/modifier-groups?restaurant_id=${restaurantId}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch modifier groups')
      }
      return res.json()
    },
  })
}

export function useApplyModifierGroup() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: ApplyModifierGroupData) => {
      const res = await fetch('/api/menu/apply-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to apply modifier group')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/builder'] 
      })
      toast({
        title: "Success",
        description: `Modifier group applied to ${data.dishes_updated} dish(es)`,
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
    mutationFn: async (modifierGroupId: number) => {
      const res = await fetch('/api/menu/break-inheritance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modifier_group_id: modifierGroupId }),
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
        description: "Modifier group inheritance broken - now a custom group",
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
      modifier_group_ids?: number[]
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

// ============================================
// DISH PRICE VARIANTS
// ============================================

export function useDishPrices(dishId: number | null) {
  return useQuery<DishPrice[]>({
    queryKey: ['/api/menu/dish-prices', dishId],
    queryFn: async () => {
      if (!dishId) return []
      const response = await fetch(`/api/menu/dish-prices?dish_id=${dishId}`, {
        credentials: 'include', // Ensure cookies are sent for auth
      })
      if (!response.ok) {
        throw new Error('Failed to fetch dish prices')
      }
      return response.json()
    },
    enabled: !!dishId,
    staleTime: 30000, // Cache for 30 seconds to reduce unnecessary refetches
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}

export function useCreateDishPrice() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      dish_id: number
      size_variant: string | null
      price: number
      display_order?: number
      is_active?: boolean
    }) => {
      return await apiRequest('/api/menu/dish-prices', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/dish-prices', variables.dish_id] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/builder'] 
      })
      toast({
        title: "Success",
        description: "Price variant created successfully",
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

export function useUpdateDishPrice() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      id: number
      dish_id: number
      size_variant?: string | null
      price?: number
      display_order?: number
      is_active?: boolean
    }) => {
      return await apiRequest('/api/menu/dish-prices', {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/dish-prices', variables.dish_id] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/builder'] 
      })
      toast({
        title: "Success",
        description: "Price variant updated successfully",
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

export function useDeleteDishPrice() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: { id: number; dish_id: number }) => {
      return await apiRequest('/api/menu/dish-prices', {
        method: 'DELETE',
        body: JSON.stringify({ id: data.id }),
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/dish-prices', variables.dish_id] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['/api/menu/builder'] 
      })
      toast({
        title: "Success",
        description: "Price variant deleted successfully",
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
