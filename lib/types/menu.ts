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
  parent_modifier_id: number | null
  instructions: string | null
  created_at: string
  updated_at: string
}

export interface DishModifier {
  id: number
  uuid: string
  restaurant_id: number
  dish_id: number
  modifier_group_id: number
  name: string
  modifier_type: string | null
  is_default: boolean
  display_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ModifierPrice {
  id: number
  uuid: string
  dish_modifier_id: number
  dish_id: number
  size_variant: string | null
  price: number
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// ============================================
// NESTED TYPES (for SQL function response)
// ============================================

export interface DishModifierWithPrices extends DishModifier {
  prices: ModifierPrice[]
}

export interface ModifierGroupWithModifiers extends ModifierGroup {
  modifiers: DishModifierWithPrices[]
}

// Legacy alias for backwards compatibility
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
// SPECIAL COMBO SELECTION TYPES
// ============================================

/**
 * A dish that can be selected as part of a special combo
 * (e.g., "Choose your Nacho" from a list of 12 nacho varieties)
 */
export interface ComboDishSelection {
  id: number                      // combo_group_dish_selections.id
  dish_id: number                 // The dish being offered as a selection
  dish_name: string               // dishes.name
  dish_display_name: string | null // Override display name (e.g., "Caesar Salad Large")
  size: number | null             // Size variant: 0=Small, 1=Medium, 2=Large, 3=X-Large, null=no size
  course_id: number | null        // For UI grouping
  course_name: string | null      // For UI grouping (e.g., "Nachos", "Burgers")
}

/**
 * Extended combo group that may have special dish selections
 * When has_special_section=true, customers select from dish_selections array
 */
export interface ComboGroupWithSpecialSection {
  id: number
  name: string
  display_order?: number
  has_special_section: boolean    // If true, use dish_selections instead of just modifiers
  number_of_items: number         // How many dishes customer must select (e.g., 1, 2, 3)
  display_header: string | null   // UI header. Semicolon-separated for multiple: "First Burger;Second Burger"
  dish_selections: ComboDishSelection[]  // The dishes customer can choose from
  sections: ComboGroupSection[]   // Regular modifier sections (can coexist with dish_selections)
}

/**
 * Combo group section with modifier groups
 */
export interface ComboGroupSection {
  id: number
  combo_group_id: number
  section_type: string | null
  use_header: string | null
  display_order: number
  free_items: number
  min_selection: number
  max_selection: number
  is_active: boolean
  modifier_groups: ComboModifierGroup[]
}

/**
 * Modifier group within a combo section
 */
export interface ComboModifierGroup {
  id: number
  combo_group_section_id: number
  name: string
  type_code: string | null
  min_selection: number
  max_selection: number
  is_selected: boolean
  modifiers: ComboModifier[]
}

/**
 * Individual modifier within a combo modifier group
 */
export interface ComboModifier {
  id: number
  combo_modifier_group_id: number
  name: string
  display_order: number
  prices: ComboModifierPrice[]
  placements?: ComboModifierPlacement[]
}

/**
 * Price for a combo modifier
 */
export interface ComboModifierPrice {
  id: number
  combo_modifier_id: number
  size_variant: string | null
  price: number
}

/**
 * Placement option for a combo modifier (e.g., "Whole", "Left Half", "Right Half")
 */
export interface ComboModifierPlacement {
  id: number
  combo_modifier_id: number
  placement: string
  price_adjustment: number
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
