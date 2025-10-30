# Refactored Menu & Catalog Types - TypeScript Reference

**Created:** October 30, 2025  
**Status:** 🎯 Ready for Implementation  
**For:** Frontend Integration Post-Refactoring

---

## Overview

This document defines the TypeScript types for the **refactored Menu & Catalog system** after completing all 14 phases of the enterprise refactoring plan. These types align with the modern, simplified database schema.

---

## Core Menu Types

### MenuCourse (Categories)

```typescript
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
  
  // Legacy tracking (reference only)
  legacy_v1_id: number | null
  legacy_v2_id: number | null
  source_system: 'v1' | 'v2' | 'v3'
}
```

---

### MenuDish

```typescript
export interface MenuDish {
  id: number
  restaurant_id: number
  course_id: number | null
  name: string
  description: string | null
  image_url: string | null
  is_active: boolean
  is_featured: boolean
  has_customization: boolean  // Has modifier groups
  display_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  
  // Legacy tracking (reference only)
  legacy_v1_id: number | null
  legacy_v2_id: number | null
  source_system: 'v1' | 'v2' | 'v3'
  
  // ❌ REMOVED in refactoring:
  // - base_price (moved to dish_prices)
  // - prices JSONB (moved to dish_prices)
  // - size_options JSONB (moved to dish_size_options)
}
```

---

## Pricing Types

### DishPrice (Relational Pricing)

```typescript
export interface DishPrice {
  id: number
  dish_id: number
  size_variant: string  // 'default', 'small', 'medium', 'large', etc.
  price: number         // Decimal(10,2)
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}
```

**Example:**
```typescript
const pizzaPrices: DishPrice[] = [
  { dish_id: 123, size_variant: 'small', price: 12.99, display_order: 0 },
  { dish_id: 123, size_variant: 'medium', price: 15.99, display_order: 1 },
  { dish_id: 123, size_variant: 'large', price: 18.99, display_order: 2 }
]
```

---

### DishSizeOption (Enterprise Pattern)

```typescript
export type SizeType = 'single' | 'small' | 'medium' | 'large' | 'xlarge'

export interface DishSizeOption {
  id: number
  dish_id: number
  size_code: SizeType
  size_label: string     // '12 inch', '16 inch', '20 inch'
  price: number
  calories: number | null
  is_default: boolean
  display_order: number
  created_at: string
  updated_at: string
}
```

---

## Modern Modifier System

### ModifierGroup (Direct, Not Ingredient-Based)

```typescript
export interface ModifierGroup {
  id: number
  dish_id: number
  name: string              // 'Size', 'Extra Toppings', 'Crust Type'
  is_required: boolean
  min_selections: number    // 0 = optional
  max_selections: number    // 999 = unlimited
  display_order: number
  created_at: string
  updated_at: string
}
```

**Example:**
```typescript
const toppingsGroup: ModifierGroup = {
  id: 1,
  dish_id: 123,
  name: 'Extra Toppings',
  is_required: false,
  min_selections: 0,
  max_selections: 5,
  display_order: 1
}
```

---

### DishModifier (Direct Name + Price)

```typescript
export interface DishModifier {
  id: number
  modifier_group_id: number
  name: string              // 'Extra Cheese', 'Mushrooms', 'Bacon'
  price: number             // Direct price, no FK to ingredients
  is_included: boolean      // Free with dish
  is_default: boolean       // Auto-selected
  display_order: number
  created_at: string
  updated_at: string
  
  // ❌ REMOVED in refactoring:
  // - ingredient_id (no longer ingredient-based)
  // - ingredient_group_id (no longer used)
}
```

**Example:**
```typescript
const modifiers: DishModifier[] = [
  { 
    modifier_group_id: 1, 
    name: 'Extra Cheese', 
    price: 1.50, 
    is_included: false,
    is_default: false 
  },
  { 
    modifier_group_id: 1, 
    name: 'Mushrooms', 
    price: 1.00, 
    is_included: false,
    is_default: false 
  }
]
```

---

## Combo System

### ComboGroup

```typescript
export interface ComboGroup {
  id: number
  restaurant_id: number
  name: string
  description: string | null
  combo_price: number       // Fixed bundle price
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}
```

---

### ComboItem

```typescript
export interface ComboItem {
  id: number
  combo_group_id: number
  dish_id: number
  quantity: number
  is_required: boolean
  display_order: number
  created_at: string
  updated_at: string
}
```

---

### ComboStep (NEW - Populated in Phase 4)

```typescript
export interface ComboStep {
  id: number
  combo_item_id: number
  step_number: number       // 1, 2, 3, etc.
  step_label: string        // 'Choose your main', 'Pick a side', 'Select a drink'
  created_at: string
  updated_at: string
}
```

---

## Enterprise Features

### DishAllergen

```typescript
export type AllergenType = 
  | 'dairy' | 'eggs' | 'fish' | 'shellfish' 
  | 'tree_nuts' | 'peanuts' | 'wheat' | 'soy' 
  | 'sesame' | 'gluten' | 'sulfites'

export interface DishAllergen {
  id: number
  dish_id: number
  allergen: AllergenType
  severity: 'contains' | 'may_contain' | 'prepared_with'
  created_at: string
}
```

---

### DishDietaryTag

```typescript
export type DietaryTag = 
  | 'vegetarian' | 'vegan' | 'gluten_free' 
  | 'dairy_free' | 'nut_free' | 'halal' 
  | 'kosher' | 'keto' | 'low_carb' | 'organic'

export interface DishDietaryTag {
  id: number
  dish_id: number
  tag: DietaryTag
  is_certified: boolean     // Official certification vs self-reported
  created_at: string
}
```

---

### DishIngredient (Repurposed - Not for Modifiers)

```typescript
export interface DishIngredient {
  id: number
  dish_id: number
  ingredient_id: number
  quantity: number | null   // 2 cups, 3 oz
  unit: string | null       // 'cups', 'oz', 'grams'
  is_allergen: boolean
  created_at: string
}
```

**Purpose:** What's **IN** the dish (for allergen tracking, nutrition), NOT for customer customization

---

## Complete Menu Response Type

### RestaurantMenu (from get_restaurant_menu() SQL function)

```typescript
export interface RestaurantMenu {
  restaurant_id: number
  courses: MenuCourseWithDishes[]
}

export interface MenuCourseWithDishes extends MenuCourse {
  dishes: DishWithDetails[]
}

export interface DishWithDetails extends MenuDish {
  prices: DishPrice[]
  modifiers: ModifierGroupWithOptions[]
  allergens?: DishAllergen[]
  dietary_tags?: DishDietaryTag[]
}

export interface ModifierGroupWithOptions extends ModifierGroup {
  options: DishModifier[]
}
```

---

## API Request/Response Types

### Create/Update Operations

```typescript
export interface CreateDishData {
  restaurant_id: number
  course_id?: number | null
  name: string
  description?: string | null
  image_url?: string | null
  is_active?: boolean
  is_featured?: boolean
  has_customization?: boolean
  display_order?: number
}

export interface UpdateDishData {
  course_id?: number | null
  name?: string
  description?: string | null
  image_url?: string | null
  is_active?: boolean
  is_featured?: boolean
  has_customization?: boolean
  display_order?: number
}

export interface CreateModifierGroupData {
  name: string
  is_required?: boolean
  min_selections?: number
  max_selections?: number
}

export interface UpdateModifierGroupData {
  name?: string
  is_required?: boolean
  min_selections?: number
  max_selections?: number
}

export interface CreateModifierData {
  name: string
  price: number
  is_included?: boolean
  is_default?: boolean
}

export interface UpdateModifierData {
  name?: string
  price?: number
  is_included?: boolean
  is_default?: boolean
}
```

---

## Customer Order Types

### SelectedModifier (Customer Choice)

```typescript
export interface SelectedModifier {
  modifier_id: number
  modifier_group_id: number
  name: string
  price: number
  quantity: number
}
```

---

### DishCustomization (Customer Order)

```typescript
export interface DishCustomization {
  dish_id: number
  size_variant: string
  selected_modifiers: SelectedModifier[]
  special_instructions?: string
}
```

---

### PriceCalculation (from calculate_dish_price() SQL function)

```typescript
export interface PriceCalculation {
  base_price: number
  size_price: number
  modifier_charges: number
  total_price: number
  breakdown: {
    base: number
    size: number
    modifiers: {
      modifier_id: number
      name: string
      price: number
      quantity: number
      subtotal: number
    }[]
  }
}
```

---

## Validation Types

### ModifierValidationResult (from validate_dish_customization() SQL function)

```typescript
export interface ModifierValidationResult {
  valid: boolean
  errors: ModifierValidationError[]
  total_price: number
}

export interface ModifierValidationError {
  modifier_group_id: number
  group_name: string
  error_type: 'min_not_met' | 'max_exceeded' | 'invalid_modifier'
  message: string
  required: {
    min: number
    max: number
  }
  actual: number
}
```

---

## Deprecated Types (DO NOT USE)

These types reference the **old schema** and should NOT be used post-refactoring:

```typescript
// ❌ REMOVED - Used ingredient-based modifiers
export interface OldDishModifier {
  ingredient_id: number        // ❌ No longer exists
  ingredient_group_id: number  // ❌ No longer exists
  modifier_type: string        // ❌ Replaced by modifier_groups.name
}

// ❌ REMOVED - Replaced by dish_prices table
export interface OldPriceBySize {
  s?: string    // ❌ JSONB format, inconsistent
  m?: string
  l?: string
}

// ❌ REMOVED - Used 2-letter codes
export type OldGroupType = 'ci' | 'e' | 'sd' | 'd' | 'sa' | 'br' | 'dr' | 'cm'

// ✅ NEW - Full words
export type GroupType = 
  | 'custom_ingredients' | 'extras' | 'side_dishes' | 'drinks' 
  | 'sauces' | 'bread' | 'dressings' | 'cooking_method'
```

---

## Key Architectural Changes

### Before Refactoring (V1/V2 Hybrid)

```typescript
// ❌ Complex, 5 JOINs to get a modifier price
dish → dish_modifiers → ingredient_id → ingredients
                     → ingredient_group_id → ingredient_groups
                     → dish_modifier_prices (separate table)
```

### After Refactoring (V3 Clean)

```typescript
// ✅ Simple, 1 JOIN to get all modifiers
dish → modifier_groups → dish_modifiers (name + price directly)
```

---

## Usage Examples

### Fetching a Complete Menu

```typescript
import { useQuery } from '@tanstack/react-query'

function useRestaurantMenu(restaurantId: number) {
  return useQuery<RestaurantMenu>({
    queryKey: ['/api/menu/restaurants', restaurantId],
    queryFn: async () => {
      const res = await fetch(`/api/menu/restaurants/${restaurantId}`)
      if (!res.ok) throw new Error('Failed to fetch menu')
      return res.json()
    }
  })
}

// Usage:
const { data: menu } = useRestaurantMenu(379)

menu?.courses.forEach(course => {
  console.log(`Category: ${course.name}`)
  course.dishes.forEach(dish => {
    console.log(`  - ${dish.name}: $${dish.prices[0]?.price}`)
    dish.modifiers?.forEach(group => {
      console.log(`    Modifiers (${group.name}):`)
      group.options.forEach(mod => {
        console.log(`      - ${mod.name} +$${mod.price}`)
      })
    })
  })
})
```

---

### Calculating Dish Price with Modifiers

```typescript
interface CalculatePriceRequest {
  dish_id: number
  size_code: string
  modifiers: { modifier_id: number; quantity: number }[]
}

async function calculateDishPrice(request: CalculatePriceRequest): Promise<PriceCalculation> {
  const res = await fetch('/api/menu/calculate-price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  if (!res.ok) throw new Error('Failed to calculate price')
  return res.json()
}

// Usage:
const price = await calculateDishPrice({
  dish_id: 123,
  size_code: 'large',
  modifiers: [
    { modifier_id: 45, quantity: 1 },  // Extra Cheese +$1.50
    { modifier_id: 46, quantity: 2 }   // Bacon +$2.00 × 2
  ]
})

console.log(`Total: $${price.total_price}`)
// Output: Total: $23.99 (base $18.99 + cheese $1.50 + bacon $4.00)
```

---

### Validating Customer Selections

```typescript
interface ValidateRequest {
  dish_id: number
  selected_modifiers: Record<number, number[]>  // { group_id: [modifier_id, ...] }
}

async function validateCustomization(request: ValidateRequest): Promise<ModifierValidationResult> {
  const res = await fetch('/api/menu/validate-customization', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  if (!res.ok) throw new Error('Failed to validate')
  return res.json()
}

// Usage:
const validation = await validateCustomization({
  dish_id: 123,
  selected_modifiers: {
    1: [45, 46],  // Group 1 (Toppings): Extra Cheese, Bacon
    2: [52]       // Group 2 (Crust): Stuffed Crust
  }
})

if (!validation.valid) {
  validation.errors.forEach(err => {
    console.error(`${err.group_name}: ${err.message}`)
  })
}
```

---

## Migration Notes

When updating existing code post-refactoring:

1. **Remove references to `ingredient_id` in modifiers** - Use direct `name` and `price` fields
2. **Replace `dish.base_price` with `dish.prices[0].price`** - Pricing is now relational
3. **Update modifier group queries** - No longer need `ingredient_groups` JOIN
4. **Remove V1/V2 branching logic** - All data is now V3 format
5. **Update allergen tracking** - Use `dish_ingredients` table, not modifiers

---

**Status:** ✅ Ready for Implementation  
**Next:** Wait for Cursor to complete database refactoring (Phases 1-13)  
**Then:** Implement API routes using these types  
**Last Updated:** October 30, 2025
