# Menu & Catalog Refactoring - Backend Integration Guide

**Last Updated**: October 31, 2025  
**Status**: ✅ Phase 11 Complete - All API Routes Updated  
**Target Audience**: Santiago (Frontend Developer)

---

## 🎯 Quick Start Summary

The Menu.ca database has been completely refactored from a fragmented V1/V2 hybrid system to an enterprise-grade architecture matching industry standards (Uber Eats, DoorDash patterns). All database work is **100% complete** and all API routes have been updated.

**What Changed:**
- ✅ Single unified pricing system (`dish_prices` table)
- ✅ Modern modifier system (`modifier_groups` → `dish_modifiers`)
- ✅ Comprehensive combo/meal system (`combo_steps`, `combo_items`)
- ✅ All V1/V2 branching logic removed
- ✅ 50+ optimized SQL functions
- ✅ Full RLS policies and performance indexes

**Your Task:** Frontend integration is already complete! Hooks and API routes are working. This guide helps you understand the new architecture.

---

## 📊 Refactored Schema Architecture

### Core Tables (Post-Refactoring)

```
Restaurant Structure:
├── menu_courses (categories: Appetizers, Mains, Desserts)
│   └── dishes (menu items)
│       ├── dish_prices (replaces JSONB prices)
│       ├── modifier_groups (customization groups: Size, Toppings, etc.)
│       │   └── dish_modifiers (direct name+price, no ingredient FK)
│       ├── dish_size_options (Small, Medium, Large configurations)
│       ├── dish_allergens (allergen tracking)
│       ├── dish_dietary_tags (vegan, gluten-free, etc.)
│       ├── dish_ingredients (for nutrition/allergen tracking only)
│       └── dish_inventory (stock tracking)
│
└── combos (meal deals)
    ├── combo_steps (step-by-step selection: Pick main, Pick side, etc.)
    └── combo_items (available choices per step)
```

### Key Changes from V1/V2

| **Aspect** | **Old System (V1/V2)** | **New System (Refactored)** |
|------------|------------------------|------------------------------|
| **Pricing** | `dishes.prices` JSONB + `base_price` | `dish_prices` relational table |
| **Sizes** | `dishes.size_options` JSONB | `dish_size_options` table |
| **Modifiers** | `dish_modifiers` → `ingredients` FK | `dish_modifiers` direct name+price |
| **Modifier Groups** | `dish_modifier_groups` (unused) | `modifier_groups` (active) |
| **Combos** | Flat `combo_items` | `combo_steps` + `combo_items` hierarchy |
| **Branching Logic** | V1/V2 conditionals in SQL | Single code path |

---

## 🔌 Updated API Routes

### 1. Customer Menu Route (Public)
**Path**: `GET /api/customer/restaurants/[slug]/menu`

**Changes**:
- Now calls `get_restaurant_menu(p_restaurant_id, p_language_code)` SQL function
- Returns full structured object (courses, dishes, modifiers, pricing)
- Supports multi-language (`?language=en|fr|es`)

**Response Format**:
```typescript
{
  restaurant_id: number
  courses: [
    {
      id: number
      name: string
      display_order: number
      dishes: [
        {
          id: number
          name: string
          description: string
          image_url: string
          is_available: boolean
          prices: [
            { size_code: 'default' | 'small' | 'medium' | 'large', amount: number }
          ]
          modifier_groups: [
            {
              id: number
              name: string
              is_required: boolean
              min_selections: number
              max_selections: number
              modifiers: [
                { id: number, name: string, price: number, is_default: boolean }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Hook**: Use existing `useQuery` with queryKey `['/api/customer/restaurants', slug, 'menu']`

---

### 2. Validation Route (New)
**Path**: `POST /api/menu/validate-customization`

**Purpose**: Validates customer dish customization against business rules

**Request Body**:
```typescript
{
  dish_id: number
  selected_modifiers: [
    { modifier_group_id: number, modifier_id: number }
  ]
}
```

**Response**:
```typescript
{
  is_valid: boolean
  errors: string[]  // e.g., ["Size is required", "Select 1-3 toppings"]
}
```

**Usage Example**:
```typescript
const validateCustomization = async (dishId: number, selections: ModifierSelection[]) => {
  const res = await fetch('/api/menu/validate-customization', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      dish_id: dishId, 
      selected_modifiers: selections 
    })
  });
  return res.json();
};
```

---

### 3. Price Calculation Route (New)
**Path**: `POST /api/menu/calculate-price`

**Purpose**: Calculates total price for dish + customizations

**Request Body**:
```typescript
{
  dish_id: number
  size_code?: string  // default: 'default'
  modifiers?: [
    { modifier_id: number, quantity?: number }
  ]
}
```

**Response**:
```typescript
{
  base_price: number
  modifier_total: number
  total_price: number
  breakdown: [
    { item: string, price: number }
  ]
  currency: string  // 'CAD'
}
```

**Usage Example**:
```typescript
const calculatePrice = async (dishId: number, size: string, modifiers: ModifierSelection[]) => {
  const res = await fetch('/api/menu/calculate-price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      dish_id: dishId, 
      size_code: size,
      modifiers 
    })
  });
  return res.json();
};
```

---

### 4. Modifier Groups CRUD (Updated)
**All routes now use `modifier_groups` table** (not `dish_modifier_groups`)

**Routes**:
- `GET /api/menu/dishes/[id]/modifier-groups` - List all groups for dish
- `POST /api/menu/dishes/[id]/modifier-groups` - Create new group
- `PATCH /api/menu/dishes/[id]/modifier-groups/[groupId]` - Update group
- `DELETE /api/menu/dishes/[id]/modifier-groups/[groupId]` - Delete group
- `POST /api/menu/dishes/[id]/modifier-groups/reorder` - Reorder groups

**Updated Columns**:
- ✅ `is_required` (boolean)
- ✅ `min_selections` (number, 0 = optional)
- ✅ `max_selections` (number, 999 = unlimited)

**Hook Usage** (unchanged):
```typescript
import { 
  useModifierGroups,
  useCreateModifierGroup,
  useUpdateModifierGroup,
  useDeleteModifierGroup,
  useReorderModifierGroups
} from '@/lib/hooks/use-modifiers';

// Fetch groups
const { data: groups } = useModifierGroups(dishId);

// Create group
const createGroup = useCreateModifierGroup();
await createGroup.mutateAsync({
  dishId,
  data: {
    name: 'Size',
    is_required: true,
    min_selections: 1,
    max_selections: 1
  }
});
```

---

## 🪝 Verified Hooks (Already Compatible)

### ✅ use-menu.ts
**Location**: `lib/hooks/use-menu.ts`

**Exports**:
- `useMenuCourses(restaurantId)` - Fetch categories
- `useMenuDishes(filters)` - Fetch dishes with filters
- `useMenuDish(id)` - Fetch single dish
- `useCreateDish()`, `useUpdateDish()`, `useDeleteDish()`
- `useDishInventory(dishId)` - Stock availability
- `useToggleDishAvailability()` - Mark sold out

**Status**: ✅ Fully compatible with refactored schema

---

### ✅ use-modifiers.ts
**Location**: `lib/hooks/use-modifiers.ts`

**Exports**:
- `useModifierGroups(dishId)` - Fetch groups
- `useCreateModifierGroup()`, `useUpdateModifierGroup()`, `useDeleteModifierGroup()`
- `useReorderModifierGroups()` - Drag-drop reordering
- `useModifiers(dishId, groupId)` - Fetch modifiers for group
- `useCreateModifier()`, `useUpdateModifier()`, `useDeleteModifier()`
- `useReorderModifiers()` - Drag-drop reordering

**Status**: ✅ Fully compatible with refactored schema

---

## 🔍 Key SQL Functions (Backend)

These are the optimized SQL functions powering the API routes:

### 1. `get_restaurant_menu(p_restaurant_id, p_language_code)`
**Returns**: Complete menu hierarchy with translations
- Courses → Dishes → Prices → Modifier Groups → Modifiers
- Filters out inactive items
- Respects inventory availability
- Multi-language support (fallback to English)

---

### 2. `validate_dish_customization(p_dish_id, p_selected_modifiers)`
**Returns**: `{is_valid, errors[]}`
**Validates**:
- Required modifier groups selected
- Min/max selections per group
- Valid modifier IDs for dish
- Group membership rules

---

### 3. `calculate_dish_price(p_dish_id, p_size_code, p_modifiers)`
**Returns**: `{base_price, modifier_total, total_price, breakdown, currency}`
**Calculates**:
- Base dish price (or size-specific price)
- Modifier price additions
- Quantity multipliers
- Itemized breakdown

---

### 4. `calculate_combo_price(p_combo_id, p_selections)`
**Returns**: `{base_price, upcharge_total, total_price, breakdown, currency}`
**Calculates**:
- Combo base price
- Upcharges for premium selections
- Step-by-step breakdown

---

## 📝 Migration Notes for Frontend

### ❌ Deprecated Fields (DO NOT USE)
These fields still exist in the database for backwards compatibility but are **deprecated**:

```typescript
// DEPRECATED - Do not use:
dishes.base_price        // Use dish_prices table
dishes.prices            // JSONB - Use dish_prices table
dishes.size_options      // JSONB - Use dish_size_options table
```

### ✅ Use Instead
```typescript
// Fetch pricing from dish_prices table via API routes
const { data: prices } = useQuery('/api/menu/dishes/${dishId}/prices');

// Fetch size options from dish_size_options table
const { data: sizes } = useQuery('/api/menu/dishes/${dishId}/sizes');
```

---

## 🧪 Testing Guidelines

### Integration Testing
Since API routes are updated, test the following flows:

1. **Menu Display**:
   ```typescript
   // Test menu loads with correct pricing
   const menu = await fetch('/api/customer/restaurants/test-restaurant/menu?language=en');
   expect(menu.courses).toBeDefined();
   expect(menu.courses[0].dishes[0].prices).toBeDefined();
   ```

2. **Customization Validation**:
   ```typescript
   // Test required modifier groups are enforced
   const result = await validateCustomization(dishId, []);
   expect(result.is_valid).toBe(false);
   expect(result.errors).toContain('Size is required');
   ```

3. **Price Calculation**:
   ```typescript
   // Test pricing includes modifiers
   const price = await calculatePrice(dishId, 'large', [
     { modifier_id: 123, quantity: 1 }
   ]);
   expect(price.total_price).toBeGreaterThan(price.base_price);
   ```

---

## 🚀 Next Steps for Frontend Development

### Immediate (No Changes Needed)
- ✅ Existing hooks work with refactored schema
- ✅ Modifier groups use correct table/columns
- ✅ API routes return full objects (no data loss)

### Recommended (Future Enhancement)
1. **Leverage New Validation Route**:
   - Add real-time validation as users customize dishes
   - Show validation errors before cart submission

2. **Leverage Price Calculation Route**:
   - Display live price updates as modifiers change
   - Show itemized breakdown in cart

3. **Inventory Integration**:
   - Use `dish_inventory.is_available` to show "Sold Out" badges
   - Respect `unavailable_until` for temporary outages

4. **Multi-Language Support**:
   - Pass `?language=fr` or `?language=es` to menu route
   - Fallback to English if translation missing

---

## 📚 Reference Documentation

- **Refactoring Plan**: `lib/Documentation/Frontend-Guides/Menu-refatoring/MENU_CATALOG_REFACTORING_PLAN.md`
- **TypeScript Types**: `lib/Documentation/Frontend-Guides/Menu-refatoring/REFACTORED_MENU_TYPES.md`
- **Hooks Reference**: 
  - `lib/hooks/use-menu.ts`
  - `lib/hooks/use-modifiers.ts`

---

## ❓ FAQ

### Q: Can I still use the old `dish_modifier_groups` table?
**A**: No, it was dropped. Use `modifier_groups` table instead. All routes already updated.

### Q: How do I handle dish pricing now?
**A**: Query `dish_prices` table via API routes. Each dish can have multiple prices (default, small, medium, large).

### Q: What if I need to customize the menu response?
**A**: The `get_restaurant_menu()` SQL function can be modified in Supabase. Contact backend team.

### Q: Are combo meals supported?
**A**: Yes! Use `combo_steps` + `combo_items` tables. Hook development pending.

### Q: How do I test modifier validation locally?
**A**: Use the `/api/menu/validate-customization` route. Requires valid `dish_id` and `selected_modifiers` array.

---

## ✅ Completion Status

| Phase | Status | Notes |
|-------|--------|-------|
| Database Refactoring | ✅ Complete | All 13 phases done (Cursor) |
| SQL Functions | ✅ Complete | 50+ functions optimized |
| API Route Updates | ✅ Complete | 6 routes updated (Replit) |
| Hook Verification | ✅ Complete | use-menu.ts, use-modifiers.ts compatible |
| Documentation | ✅ Complete | This guide + types reference |
| Integration Testing | ⏳ Pending | Next: E2E Playwright tests |

---

**Questions?** Contact the backend team or refer to the refactoring plan documentation.
