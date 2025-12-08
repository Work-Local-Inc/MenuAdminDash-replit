# Menu.ca Modifier System - Quick Reference

## CRITICAL: Multi-Tenant Architecture
- **Each location has its OWN modifiers** - no global/shared modifiers
- **Restaurant owners only see their own data** - complete isolation
- **All modifiers include restaurant_id** - enforces tenant separation

## Key Terminology

**Modifier Group** = Container/category of options
- Example: "Crust Type", "Toppings", "Wing Sauce"

**Modifier** = Individual option within a group  
- Example: "Thin Crust", "Pepperoni", "BBQ Sauce"

**Nested Modifier** = Modifier group attached to a modifier
- Example: "Topping Placement" nested under "Pepperoni" topping

> **IMPORTANT**: Never use "template" terminology in UI or code - always use "modifier" and "modifier group"

## 5 Core Tables

```
menu_items → What they're ordering
  ↓
menu_item_modifier_groups → Which groups apply to this item
  ↓  
modifier_groups → The categories (Crust, Toppings, etc)
  ↓
modifier_group_items → Links modifiers to groups
  ↓
modifiers → The actual options (Thin, Thick, Pepperoni, etc)
  ↓ (optional)
modifier_nested_groups → 2nd level groups attached to modifiers
```

## Modifier Group Settings

### Selection Rules
- **is_required**: Must pick something? (bool)
- **is_exclusive**: Radio buttons (true) vs checkboxes (false)
- **min_selections**: Minimum picks (int)
- **max_selections**: Max picks, NULL = unlimited
- **free_quantity**: First X are free (for "2 free toppings")

### Pricing Models
- **per_item**: Each modifier has own price (most common)
- **as_group**: Pay one price for entire group selection
- **free_up_to_x**: First X free, then per_item pricing kicks in

## Real World Examples

### Example 1: Pizza Crust (Simple)
```
Modifier Group: "Crust Type"
├─ is_required: true
├─ is_exclusive: true  
├─ min_selections: 1
├─ max_selections: 1
└─ Modifiers:
    ├─ Thin Crust ($0)
    ├─ Hand Tossed ($0)
    └─ Stuffed Crust (+$2)
```

### Example 2: Pizza Toppings (With Nesting)
```
Modifier Group: "Toppings"
├─ is_required: false
├─ is_exclusive: false
├─ min_selections: 0
├─ max_selections: 10
├─ free_quantity: 2
└─ Modifiers:
    ├─ Pepperoni (+$1.50)
    │   └─ NESTED: "Placement"
    │       ├─ Whole Pizza
    │       ├─ Left Half
    │       └─ Right Half
    │
    ├─ Mushrooms (+$1.00)
    │   └─ NESTED: "Placement"
    │
    └─ Extra Cheese (+$1.50)
        └─ NESTED: "Placement"
```

### Example 3: Wings (Multiple Groups)
```
Menu Item: "10pc Wings"

Group 1: "Wing Sauce" (required, exclusive)
├─ BBQ
├─ Hot
└─ Honey Garlic

Group 2: "Heat Level" (required, exclusive)  
├─ Mild
├─ Medium
└─ Hot

Group 3: "Dipping Sauce" (optional, max: 3)
├─ Ranch (+$0.50)
├─ Blue Cheese (+$0.50)
└─ Extra Hot Sauce (+$0)
```

### Example 4: 2 Pizza Special (Multi-Item Combo)
```
Menu Item: "2 Pizza Special" ($29.99)

├─ "Pizza 1 - Crust" (group_id: pizza1-crust)
├─ "Pizza 1 - Toppings" (group_id: pizza1-toppings)
├─ "Pizza 1 - Dips" (group_id: pizza1-dips)
├─ "Pizza 2 - Crust" (group_id: pizza2-crust)  
├─ "Pizza 2 - Toppings" (group_id: pizza2-toppings)
└─ "Pizza 2 - Dips" (group_id: pizza2-dips)
```
Note: Same modifier groups, just duplicated with different IDs/names

## Database Insert Order

1. Create `modifiers` first
2. Create `modifier_groups`  
3. Link them via `modifier_group_items`
4. Create nested groups via `modifier_nested_groups`
5. Attach to menu items via `menu_item_modifier_groups`

## Common Patterns

### Pattern: Exclusive Required Choice
```sql
is_required = true
is_exclusive = true
min_selections = 1
max_selections = 1
```
Use for: Crust type, cooking temp, size

### Pattern: Multiple Optional Add-ons
```sql
is_required = false
is_exclusive = false
min_selections = 0  
max_selections = NULL (unlimited)
```
Use for: Extra toppings, add-ons

### Pattern: Choose X from Y
```sql
is_required = true
is_exclusive = false
min_selections = 2
max_selections = 2
```
Use for: "Pick 2 sides", "Choose 2 free toppings"

### Pattern: First X Free
```sql
is_required = false
free_quantity = 2
max_selections = 10
pricing_model = 'per_item'
```
Use for: "2 free toppings, additional $1.50 each"

## Order Storage

When customer orders, store in `order_item_modifiers`:
- Link to order_item_id
- Store modifier_id + modifier_group_id
- Store price_charged (snapshot at time of order)
- Store parent_modifier_selection_id (for nested)
- Store nesting_level (1 or 2)
- Store quantity (for "2x Extra Cheese")

## Frontend Flow Tips

1. Load menu item
2. Fetch all modifier_groups for that item (sorted by sort_order)
3. For each group, fetch modifiers (sorted by sort_order)
4. Check if any modifiers have nested groups
5. Render based on is_exclusive (radio vs checkbox)
6. Validate min/max selections before allowing "Add to Cart"
7. Calculate pricing: base + modifiers (respecting free_quantity)

## Pricing Calculation Logic

```javascript
function calculateItemPrice(basePrice, modifierSelections, modifierGroup) {
  let total = basePrice;
  let freeCount = modifierGroup.free_quantity || 0;
  
  modifierSelections.forEach((mod, index) => {
    if (index < freeCount) {
      // This one is free
    } else {
      total += mod.price * mod.quantity;
    }
    
    // Add nested modifier costs
    mod.nestedModifiers?.forEach(nested => {
      total += nested.price * nested.quantity;
    });
  });
  
  return total;
}
```

## Migration Strategy for Existing menu.ca Data

If you have existing JSONB pricing fields:

1. Create new tables above
2. Write migration script to:
   - Extract modifiers from JSONB
   - Create modifier_groups
   - Create modifiers
   - Link everything
3. Keep JSONB temporarily for rollback
4. Test extensively
5. Switch to new schema
6. Remove JSONB after confidence period

## Performance Considerations

- Index on restaurant_id (you'll query by this constantly)
- Index on menu_item_id joins
- Consider caching full modifier trees in Redis/Supabase cache
- Denormalize modifier count per group for quick validation

## Support for Future Features

This schema supports:
✅ Pizza half/half toppings
✅ "Light/Normal/Extra" quantity modifiers (use quantity field)
✅ Combo meals with multiple items
✅ Size-based modifier pricing (override_price in modifier_group_items)
✅ Restaurant-specific vs shared modifier groups
✅ Seasonal/temporary modifiers (is_active flag)
✅ Default selections (is_default flag)
✅ Prep instructions per modifier
✅ Up to 5 levels of nesting (extend parent_modifier_selection_id)

## DON'T Do This

❌ Store modifier selections as comma-separated strings
❌ Use JSONB for order item modifiers (breaks reporting)
❌ Nest more than 2-3 levels (UX nightmare)
❌ Make every modifier group nested (confusing)
❌ Skip sort_order (random ordering sucks)
❌ Forget to snapshot prices in orders (historical data breaks)
