/**
 * Menu Types for get_restaurant_menu SQL Function
 * 
 * These types represent the response from the Supabase `get_restaurant_menu` RPC
 * which returns a complete menu structure with courses, dishes, prices, and modifiers.
 */

// ============================================
// BASE TYPES (from refactored schema)
// ============================================

export interface MenuCourse {
  id: number
  restaurant_id: number
  name: string
  description: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface MenuDish {
  id: number
  restaurant_id: number
  course_id: number | null
  name: string
  description: string | null
  image_url: string | null
  is_active: boolean
  is_featured: boolean
  has_customization: boolean
  display_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface DishPrice {
  id: number
  dish_id: number
  size_variant: string
  price: number
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ModifierGroup {
  id: number
  dish_id: number
  name: string
  is_required: boolean
  min_selections: number
  max_selections: number
  display_order: number
  created_at: string
  updated_at: string
}

export interface DishModifier {
  id: number
  modifier_group_id: number
  name: string
  price: number
  is_included: boolean
  is_default: boolean
  display_order: number
  created_at: string
  updated_at: string
}

// ============================================
// NESTED TYPES (for SQL function response)
// ============================================

export interface ModifierGroupWithOptions extends ModifierGroup {
  options: DishModifier[]
}

export interface DishWithDetails extends MenuDish {
  prices: DishPrice[]
  modifiers: ModifierGroupWithOptions[]
}

export interface MenuCourseWithDishes extends MenuCourse {
  dishes: DishWithDetails[]
}

// ============================================
// MAIN RESPONSE TYPE
// ============================================

/**
 * Response from get_restaurant_menu(p_restaurant_id, p_language_code)
 */
export interface RestaurantMenuResponse {
  restaurant_id: number
  courses: MenuCourseWithDishes[]
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Simple course type for components that just need course metadata
 */
export interface SimpleCourse {
  id: number
  name: string
  dishes: Array<{
    id: number
    name: string
    description: string | null
    prices?: Array<{ price: number; size_variant: string }>
    [key: string]: any
  }>
}
