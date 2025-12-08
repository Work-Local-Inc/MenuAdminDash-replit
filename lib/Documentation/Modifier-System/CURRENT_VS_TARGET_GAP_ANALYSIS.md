# Modifier System Gap Analysis
## Current State vs. Target Architecture

---

## Current Tables (in `menuca_v3` schema)

### Dish-Level Tables
| Table | Purpose |
|-------|---------|
| `modifier_groups` | Modifier groups tied directly to dishes |
| `dish_modifier_items` | Individual modifiers within groups |

### Library-Level Tables (Admin UI at `/admin/menu/modifier-groups`)
| Table | Purpose |
|-------|---------|
| `course_modifier_templates` | Reusable modifier group definitions |
| `course_template_modifiers` | Individual modifiers in library groups |

### Current Columns - `modifier_groups`
```
id, dish_id, name, is_required, min_selections, max_selections, display_order, created_at, updated_at
```

### Current Columns - `dish_modifier_items`
```
id, modifier_group_id, name, price, is_default, is_included, display_order, created_at, updated_at
```

---

## Target Schema (Your New Plan)

### Core Tables Needed
| Table | Purpose | Status |
|-------|---------|--------|
| `modifier_groups` | Groups with `restaurant_id` (not dish_id) | ⚠️ RESTRUCTURE NEEDED |
| `modifiers` | Standalone modifiers with `restaurant_id` | ❌ MISSING |
| `modifier_group_items` | Links modifiers to groups | ❌ MISSING |
| `menu_item_modifier_groups` | Links groups to menu items | ❌ MISSING |
| `modifier_nested_groups` | Nested modifiers (pizza placement) | ❌ MISSING |
| `order_item_modifiers` | Customer selections in orders | ⚠️ NEEDS ENHANCEMENT |

---

## KEY GAPS

### 1. ❌ No Standalone Modifiers Table
**Current**: Modifiers are created inside groups (`dish_modifier_items`)  
**Target**: Modifiers exist independently, then get linked to groups  
**Why it matters**: Can't reuse "Pepperoni" across multiple groups efficiently

### 2. ❌ No `restaurant_id` on Modifier Groups
**Current**: Groups tied to `dish_id`  
**Target**: Groups tied to `restaurant_id`  
**Why it matters**: Multi-tenant isolation, can attach same group to multiple dishes

### 3. ❌ No Link Table for Menu Items ↔ Modifier Groups
**Current**: Direct `dish_id` on modifier_groups  
**Target**: `menu_item_modifier_groups` junction table  
**Why it matters**: Many-to-many relationship needed

### 4. ❌ No Nested Modifiers Support
**Current**: No nesting capability  
**Target**: `modifier_nested_groups` table  
**Why it matters**: Pizza topping placement (Left Half, Right Half, Whole)

### 5. ⚠️ Missing Fields on Modifier Groups
| Field | Current | Target |
|-------|---------|--------|
| `restaurant_id` | ❌ | ✅ Required |
| `is_exclusive` | ❌ | ✅ Radio vs checkbox |
| `free_quantity` | ❌ | ✅ "2 free toppings" |
| `pricing_model` | ❌ | ✅ per_item/as_group/free_up_to_x |
| `group_price` | ❌ | ✅ Group pricing |
| `display_name` | ❌ | ✅ Customer-facing name |

### 6. ⚠️ Missing Fields on Modifiers
| Field | Current | Target |
|-------|---------|--------|
| `restaurant_id` | ❌ | ✅ Required |
| `display_name` | ❌ | ✅ Customer-facing |
| `prep_instructions` | ❌ | ✅ Kitchen notes |

### 7. ⚠️ Order Storage Enhancement Needed
**Current**: Basic modifier storage  
**Target**: Need `parent_modifier_selection_id`, `nesting_level`, `quantity` fields

---

## MIGRATION PATH

### Phase 1: Create New Tables
1. Create `modifiers` table (standalone modifiers with `restaurant_id`)
2. Create `modifier_group_items` junction table
3. Create `menu_item_modifier_groups` junction table
4. Create `modifier_nested_groups` table

### Phase 2: Alter Existing Tables
1. Add `restaurant_id` to `modifier_groups`
2. Add `is_exclusive`, `free_quantity`, `pricing_model`, `group_price` to `modifier_groups`
3. Add `display_name`, `prep_instructions` to modifiers

### Phase 3: Data Migration
1. Extract unique modifiers from `dish_modifier_items` → create in `modifiers`
2. Create links in `modifier_group_items`
3. Create links in `menu_item_modifier_groups` based on current dish_id relationships
4. Migrate `course_modifier_templates` data if needed

### Phase 4: Update APIs & UI
1. Update Admin Menu Builder to use new schema
2. Update customer-facing menu to read new structure
3. Update order creation to store nested selections

---

## RECOMMENDATION

**Don't try to retrofit the current tables** - the architecture is fundamentally different.

Instead:
1. Create the new tables alongside existing ones
2. Build new Admin UI for the new modifier system
3. Migrate data from old → new
4. Switch customer ordering to new system
5. Deprecate old tables after confidence period

This approach:
- ✅ Zero downtime migration
- ✅ Can rollback if issues
- ✅ Proper multi-tenant isolation from day 1
- ✅ Supports nested modifiers (pizza placement)
- ✅ Supports "2 free toppings" pricing model
