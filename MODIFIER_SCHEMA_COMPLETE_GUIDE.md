# 🗂️ Complete Modifier Schema Guide

## For Your Dev: Why Groups Were Missing in v1/v2 → v3 Migration

## The COMPLETE Schema (3-Table System)

### 📊 Current Data Volumes:
```
modifier_groups:           22,632 rows
dish_modifiers:           358,499 rows  
dish_modifier_prices:     606,492 rows (more than modifiers because multi-pricing)
```

---

## The 3-Table Relationship

```sql
┌─────────────────────────────────────┐
│ dishes (50K dishes)                 │
│ - id: 139963                        │
│ - name: "One Topping Pizza"         │
│ - course_id: 2955 → courses         │
└──────────────┬──────────────────────┘
               │
               │ dish_id FK
               ▼
┌─────────────────────────────────────┐
│ modifier_groups (22K groups)        │
│ - id: 9137                          │
│ - dish_id: 139963                   │
│ - name: "First 591ml Drink Free"    │
│ - is_required: false                │
│ - min_selections: 0                 │
│ - max_selections: 1                 │
│ - course_template_id: NULL (NEW)    │ ← Links to category template
│ - is_custom: true (NEW)             │ ← Inheritance flag
└──────────────┬──────────────────────┘
               │
               │ modifier_group_id FK
               ▼
┌─────────────────────────────────────┐
│ dish_modifiers (358K modifiers)     │
│ - id: 496814                        │
│ - modifier_group_id: 9137           │
│ - name: "Pepsi"                     │
│ - NO PRICE COLUMN!                  │ ← Important!
│ - display_order: 0                  │
└──────────────┬──────────────────────┘
               │
               │ dish_modifier_id FK
               ▼
┌─────────────────────────────────────┐
│ dish_modifier_prices (606K prices)  │
│ - id: 789                           │
│ - dish_modifier_id: 496814          │
│ - price: 0.00                       │ ← The actual price!
│ - size_variant: 'Small'             │ ← Multi-pricing per size
└─────────────────────────────────────┘
```

---

## Why Prices Are in Separate Table:

**One modifier can have multiple prices:**
```
"Pepsi" modifier (id: 496814)
├─ Small:  $0.00 (size_variant: 'Small')
├─ Medium: $1.99 (size_variant: 'Medium')  
└─ Large:  $2.99 (size_variant: 'Large')

3 rows in dish_modifier_prices for 1 row in dish_modifiers
```

**That's why:** 606K prices / 358K modifiers = ~1.7 prices per modifier

---

## What Your Scraper Should Do:

### For Each Dish:

```javascript
// 1. Get the dish
const dish = await getDishFromSource(dishId);

// 2. For each modifier group on the dish
for (const modifierGroup of dish.modifierGroups) {
  
  // 2a. Create the group
  const group = await supabase
    .from('modifier_groups')
    .insert({
      dish_id: dish.id,
      name: modifierGroup.name,              // "Dips", "Sauces"
      is_required: modifierGroup.required,
      min_selections: modifierGroup.min || 0,
      max_selections: modifierGroup.max || 1,
      display_order: modifierGroup.order,
      is_custom: true,  // Start as custom
      course_template_id: null  // Will be set later by pattern detection
    })
    .select()
    .single();
  
  // 2b. For each modifier option in the group
  for (const modifier of modifierGroup.options) {
    
    // Create the modifier (NO PRICE YET)
    const mod = await supabase
      .from('dish_modifiers')
      .insert({
        modifier_group_id: group.id,
        name: modifier.name,  // "Small", "Large", "Ranch"
        display_order: modifier.order
      })
      .select()
      .single();
    
    // 2c. Create price(s) for the modifier
    // If modifier has multiple prices (sizes), create multiple rows
    const prices = modifier.prices || [{ price: modifier.price, size: 'standard' }];
    
    for (const priceData of prices) {
      await supabase
        .from('dish_modifier_prices')
        .insert({
          dish_modifier_id: mod.id,
          price: priceData.price,
          size_variant: priceData.size || 'standard'
        });
    }
  }
}
```

---

## Why "One Topping" is Missing "Dips":

### Theory 1: Scraper Filtering
```javascript
// Maybe your scraper had a filter like this?
if (modifierGroup.required || modifierGroup.isPopular) {
  scrapeModifierGroup();  // ← "Dips" might not be required
}
```

### Theory 2: Source Data Issue
```
Maybe in v1/v2:
- "Dips" was a category-level setting
- Scraper only looked at dish-level
- "One Topping" inherited it implicitly in old system
```

### Theory 3: Conditional Logic in Old System
```
Maybe old system had:
if (dish.category === 'Pizza' && !dish.isPromo) {
  addDipsModifierGroup();
}
// "One Topping" might have been flagged as promo → skipped
```

---

## How to Check Your Scraper:

### Option 1: Check Source API Response
```bash
# What does the v1/v2 API return for "One Topping"?
curl "https://old-api/dishes/139963" | jq '.modifierGroups'

# Does it include "Dips" or not?
```

### Option 2: Check Another Incomplete Dish
```sql
-- Find other dishes missing "Dips" in same category
SELECT 
    d.name as dish_name,
    d.id as dish_id,
    COUNT(mg.id) as modifier_group_count
FROM dishes d
LEFT JOIN modifier_groups mg ON mg.dish_id = d.id AND mg.deleted_at IS NULL
WHERE d.course_id = 2955  -- Milano Pizzas
AND d.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM modifier_groups 
    WHERE dish_id = d.id 
    AND name = 'Dips' 
    AND deleted_at IS NULL
)
GROUP BY d.id, d.name
ORDER BY d.name;
```

Let me run that:

<function_calls>
<invoke name="mcp_supabase_execute_sql">
<parameter name="query">SET search_path TO menuca_v3;

-- Find ALL pizzas missing "Dips" at Milano
SELECT 
    d.name as dish_name,
    d.id as dish_id,
    COUNT(mg.id) as modifier_group_count,
    STRING_AGG(mg.name, ', ' ORDER BY mg.name) as groups_it_has
FROM dishes d
LEFT JOIN modifier_groups mg ON mg.dish_id = d.id AND mg.deleted_at IS NULL
WHERE d.course_id = 2955
AND d.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM modifier_groups 
    WHERE dish_id = d.id 
    AND name = 'Dips' 
    AND deleted_at IS NULL
)
GROUP BY d.id, d.name
ORDER BY d.name;
