# Checkout & Order System - Schema Reference
**Last Updated:** November 20, 2025  
**Purpose:** Quick reference for checkout/order validation logic

## Critical Schema Patterns

### 1. Dish Pricing Structure

```
dishes (menu items)
  ├── dish_prices (relational pricing - NOT in dishes table)
  │   ├── dish_id (FK to dishes.id)
  │   ├── size_variant (e.g., "Small", "Medium", "Large", "default")
  │   ├── price (numeric)
  │   └── is_active (boolean)
```

**Key Points:**
- ✅ Dishes do NOT have a `price` column directly
- ✅ Query `dish_prices` table with `size_variant` to get price
- ✅ Column is `size_variant`, NOT `size`

### 2. Modifier Pricing Structure

```
dishes
  ├── modifier_groups (customization categories)
  │   ├── dish_id (FK to dishes.id)
  │   ├── name (e.g., "Sauce Choice", "Toppings", "Size")
  │   ├── is_required (boolean)
  │   ├── min_selections (integer)
  │   └── max_selections (integer)
  │   
  │   └── dish_modifiers (individual options)
  │       ├── id
  │       ├── modifier_group_id (FK to modifier_groups.id)
  │       ├── name (e.g., "Marinara", "Extra Cheese")
  │       ├── is_default (boolean)
  │       └── NO PRICE COLUMN HERE!
  │       
  │       └── dish_modifier_prices (separate pricing table)
  │           ├── dish_modifier_id (FK to dish_modifiers.id)
  │           ├── dish_id (FK to dishes.id)
  │           ├── size_variant (optional - for size-specific modifier pricing)
  │           ├── price (numeric, default: 0.00)
  │           └── is_active (boolean)
```

**Key Points:**
- ✅ Modifiers do NOT have a `price` column directly
- ✅ Query `dish_modifier_prices` table to get price
- ⚠️ **CRITICAL:** Some modifiers have NO price records (included/free items like sauce choices)
- ✅ If no price record exists, treat as FREE (price = 0)

### 3. Restaurant Identification

```
restaurants
  ├── id (INTEGER - primary key, used for FK relationships)
  ├── uuid (STRING - for API exposure)
  ├── name (string)
  └── NO SLUG COLUMN!
```

**Key Points:**
- ✅ URLs use format: `/r/restaurant-name-{id}` (e.g., `/r/econo-pizza-1009`)
- ✅ Extract ID from slug using `extractIdFromSlug()` utility
- ✅ Query by `id` column, NOT by `slug` (slug column doesn't exist)

### 4. Delivery Fee Structure

```
restaurants
  └── restaurant_delivery_zones (delivery areas & fees)
      ├── restaurant_id (FK to restaurants.id)
      ├── delivery_fee_cents (integer - fee in cents)
      ├── is_active (boolean)
      └── deleted_at (timestamp - soft delete)
```

**Key Points:**
- ✅ Delivery fees are in `restaurant_delivery_zones`, NOT `restaurant_service_configs`
- ✅ Fee is in CENTS (divide by 100 for dollars)
- ✅ If no active zone exists, default to FREE ($0.00)

## Validation Logic for Orders

### Step 1: Validate Dish
```sql
SELECT id, restaurant_id, name
FROM dishes
WHERE id = {dishId} AND restaurant_id = {restaurantId}
```

### Step 2: Get Dish Price
```sql
SELECT price, size_variant
FROM dish_prices
WHERE dish_id = {dishId} 
  AND size_variant = {size}  -- e.g., "Small", "default"
  AND is_active = true
```

### Step 3: Validate Modifier (if any)
```sql
-- First: Verify modifier belongs to this dish
SELECT 
  dm.id,
  dm.name,
  mg.dish_id
FROM dish_modifiers dm
JOIN modifier_groups mg ON mg.id = dm.modifier_group_id
WHERE dm.id = {modifierId}
  AND mg.dish_id = {dishId}
```

### Step 4: Get Modifier Price (if any)
```sql
SELECT price
FROM dish_modifier_prices
WHERE dish_modifier_id = {modifierId}
  AND dish_id = {dishId}
  AND is_active = true
-- If no record found: price = 0 (included/free)
```

## Common Pitfalls

❌ **DON'T:**
- Query `dishes.price` (column doesn't exist)
- Query `dish_modifiers.price` (column doesn't exist)
- Query `restaurants.slug` (column doesn't exist)
- Query `restaurant_service_configs` for delivery fees (wrong table)
- Reject modifiers with no price records (they're included/free)

✅ **DO:**
- Query `dish_prices` table for dish pricing
- Query `dish_modifier_prices` table for modifier pricing
- Extract restaurant ID from slug using `extractIdFromSlug()`
- Query `restaurant_delivery_zones` for delivery fees
- Default to price = 0 when no price record exists

## Example: Complete Order Validation

```typescript
// 1. Extract restaurant ID from slug
const restaurantId = extractIdFromSlug(restaurantSlug) // "econo-pizza-1009" → 1009

// 2. Get restaurant
const { data: restaurant } = await supabase
  .from('restaurants')
  .select('id, name, restaurant_delivery_zones(delivery_fee_cents)')
  .eq('id', restaurantId)
  .single()

// 3. Validate each cart item
for (const item of cart_items) {
  // 3a. Verify dish belongs to restaurant
  const { data: dish } = await supabase
    .from('dishes')
    .select('id, restaurant_id, name')
    .eq('id', item.dishId)
    .eq('restaurant_id', restaurantId)
    .single()
  
  // 3b. Get dish price
  const { data: dishPrice } = await supabase
    .from('dish_prices')
    .select('price')
    .eq('dish_id', item.dishId)
    .eq('size_variant', item.size)
    .eq('is_active', true)
    .single()
  
  let itemTotal = parseFloat(dishPrice.price) * item.quantity
  
  // 3c. Validate modifiers
  for (const mod of item.modifiers) {
    // Verify modifier belongs to dish
    const { data: modifierData } = await supabase
      .from('dish_modifiers')
      .select('id, name, modifier_group:modifier_groups!inner(dish_id)')
      .eq('id', mod.id)
      .single()
    
    if (modifierData.modifier_group.dish_id !== item.dishId) {
      throw new Error('Invalid modifier')
    }
    
    // Get price (or default to 0 if included/free)
    const { data: priceData } = await supabase
      .from('dish_modifier_prices')
      .select('price')
      .eq('dish_modifier_id', mod.id)
      .eq('dish_id', item.dishId)
      .eq('is_active', true)
      .single()
    
    const modPrice = priceData ? parseFloat(priceData.price) : 0 // FREE if no record
    itemTotal += modPrice * item.quantity
  }
}
```

## Schema Diagram

```
┌─────────────┐
│ restaurants │ (id: INTEGER, NO slug column)
└──────┬──────┘
       │
       ├─→ restaurant_delivery_zones (delivery_fee_cents)
       │
       └─→ dishes (menu items)
            │
            ├─→ dish_prices (size_variant, price)
            │
            └─→ modifier_groups (dish_id, name, is_required)
                 │
                 └─→ dish_modifiers (modifier_group_id, name, NO price)
                      │
                      └─→ dish_modifier_prices (dish_modifier_id, price)
                           ⚠️ May not exist for included/free modifiers!
```

## Testing Queries

```sql
-- Test 1: Get dish with all pricing
SELECT 
  d.id,
  d.name,
  json_agg(DISTINCT jsonb_build_object(
    'size', dp.size_variant,
    'price', dp.price
  )) as prices
FROM menuca_v3.dishes d
LEFT JOIN menuca_v3.dish_prices dp ON dp.dish_id = d.id AND dp.is_active = true
WHERE d.id = 170674
GROUP BY d.id, d.name;

-- Test 2: Get modifier with pricing
SELECT 
  dm.id,
  dm.name,
  mg.dish_id,
  dmp.price,
  CASE WHEN dmp.id IS NULL THEN 'FREE/INCLUDED' ELSE 'PAID' END as price_type
FROM menuca_v3.dish_modifiers dm
JOIN menuca_v3.modifier_groups mg ON mg.id = dm.modifier_group_id
LEFT JOIN menuca_v3.dish_modifier_prices dmp 
  ON dmp.dish_modifier_id = dm.id 
  AND dmp.is_active = true
WHERE dm.id = 882151;

-- Test 3: Get all modifiers for a dish
SELECT 
  mg.name as group_name,
  dm.id as modifier_id,
  dm.name as modifier_name,
  COALESCE(dmp.price, 0) as price
FROM menuca_v3.modifier_groups mg
JOIN menuca_v3.dish_modifiers dm ON dm.modifier_group_id = mg.id
LEFT JOIN menuca_v3.dish_modifier_prices dmp 
  ON dmp.dish_modifier_id = dm.id 
  AND dmp.is_active = true
WHERE mg.dish_id = 170674
ORDER BY mg.display_order, dm.display_order;
```

---

**Last Verified:** November 20, 2025  
**Status:** ✅ Schema patterns confirmed via Supabase MCP  
**Next Review:** After any schema migrations

