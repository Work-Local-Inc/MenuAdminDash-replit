# Menu & Catalog Entity - Enterprise Refactoring Plan

**Created:** October 30, 2025  
**For:** Santiago (Backend Developer)  
**Status:** 🔄 Planning Phase  
**Complexity:** ⭐⭐⭐⭐ High (Complete architectural redesign)  
**Timeline:** ~2.5 weeks (tenant_id removal already complete!)  
**Risk Level:** Low (No live app yet)

---

## 🎯 Mission Statement

Transform the Menu & Catalog entity from a **fragmented V1/V2 hybrid** into a **clean, enterprise-grade system** matching industry standards like Uber Eats, DoorDash, and Skip the Dishes.

### Goals:
1. ✅ **Break V1/V2 Logic Split** - Consolidate to unified V3 patterns
2. ✅ **Enterprise Architecture** - Match industry best practices
3. ✅ **Simplify Complexity** - Remove overlapping/duplicate systems
4. ✅ **Data Integrity** - Fix tenant_id and other quality issues
5. ✅ **Security First** - Maintain/enhance RLS policies
6. ✅ **Keep Legacy Tracking** - Preserve legacy_v1_id/legacy_v2_id for audit trail

---

## 📊 Current State Analysis (Supabase MCP Verified - Oct 30, 2025)

### ✅ Recent Improvements Already Complete:
1. **tenant_id removal** - All 31 tables cleaned (no longer in schema)
2. **Functions updated** - All functions now use restaurant_id properly

**Impact:** Reduces refactoring timeline by ~2 days! 🎉

---

## 📊 Remaining Issues to Address

### Data Distribution:

| Table | Total Rows | V1 Records | V2 Records | V3 Native | Status |
|-------|-----------|-----------|-----------|-----------|--------|
| **courses** | 1,752 | 119 (7%) | 1,088 (62%) | 545 (31%) | ⚠️ Mixed |
| **dishes** | 23,006 | 16,800 (73%) | 6,206 (27%) | 0 (0%) | ❌ Legacy Only |
| **ingredients** | 32,031 | 31,375 (98%) | 637 (2%) | 19 (<1%) | ❌ V1 Dominant |
| **ingredient_groups** | 9,288 | 9,116 (98%) | 134 (1%) | 38 (<1%) | ❌ V1 Dominant |
| **dish_modifiers** | 427,977 | - | - | - | ❌ Legacy System |
| **combo_groups** | 8,234 | - | - | - | ⚠️ Staged |

---

## 🔴 Critical Problems Identified

### Problem 1: **Dual Modifier Systems** (Architectural Confusion)

**Legacy System (Currently Active):**
```
dish_modifiers (427,977 rows) → Ingredient-Based System
├── Requires: ingredient_id (complex)
├── Requires: ingredient_groups (complex)
├── Pricing: Split across dish_modifier_prices table
└── Issue: Overly complex, not industry standard
```

**Modern System (Created but Empty):**
```
modifier_groups (0 rows) → Direct Modifier System
├── Simple: name + price directly
├── Better UX: "Size: Large (+$2.00)"
└── Industry Standard: ✅
```

**Impact:** Backend devs don't know which system to use!

---

### Problem 2: **Dual Pricing Systems** (Data Quality Nightmare)

**Old JSONB Column:**
- `dishes.prices` JSONB (5,130 dishes still use this)
- Format: `[{"s":"10", "l":"12"}]` (messy, inconsistent)

**New Relational Table:**
- `dish_prices` table (6,005 records)
- Clean: `size_variant`, `price`, `display_order`

**Yet Another Column:**
- `dishes.base_price` (single price)
- `dishes.size_options` JSONB

**Impact:** 3+ ways to price a dish! Which one is authoritative?

---

### Problem 3: **Legacy V1/V2 Codes** (Poor Readability)

**ingredient_groups.group_type:**
- Uses cryptic 2-letter codes: `ci`, `e`, `sd`, `d`, `sa`, `br`, `dr`, `cm`
- 9,116 groups (98%) use these codes
- Should use: `custom_ingredients`, `extras`, `side_dishes`, etc.

**dish_modifiers.modifier_type:**
- Correctly uses full words
- But mismatched with ingredient_groups

**Impact:** Inconsistent vocabulary, hard to understand queries

---

### ~~Problem 4: **Tenant ID Redundancy**~~ ✅ **ALREADY RESOLVED**

**Status:** ✅ tenant_id column has been removed from the schema!

**Previous Issue (Historical):**
- Was redundant copy of restaurants.uuid
- Had 31.58% incorrect data
- Not used for security (RLS uses restaurant_id)

**Current State:** Column no longer exists in any menuca_v3 tables

**Impact:** This refactoring task is already complete! One less thing to do.

---

### Problem 5: **Overlapping Tables** (Schema Bloat)

**Three Modifier Systems Exist:**
1. `dish_modifiers` (legacy, 427K rows, active)
2. `modifier_groups` + `dish_modifier_items` (modern, 0 rows, unused)
3. `dish_modifier_groups` + linking (modern, 0 rows, unused)

**Multiple Pricing Tables:**
1. `dishes.base_price` column
2. `dishes.prices` JSONB
3. `dishes.size_options` JSONB
4. `dish_prices` relational table
5. `dish_modifier_prices` relational table

**Impact:** Schema is confusing, developers don't know which to use

---

### Problem 6: **Combo System Half-Implemented**

- `combo_groups`: 8,234 rows (data exists)
- `combo_items`: 16,356 rows (data exists)
- `combo_steps`: 0 rows (empty!)
- `combo_group_modifier_pricing`: 9,061 rows (data exists)

**Impact:** Can't enable combos until combo_steps is populated

---

## 🎯 Enterprise-Grade Target Architecture

### Industry Standard Pattern (Uber Eats / DoorDash)

```
restaurants
├── courses (categories)
│   └── dishes (menu items)
│       ├── dish_options (e.g., Size, Temperature)
│       │   └── option_values (e.g., Small, Medium, Large)
│       └── dish_modifier_groups (e.g., Toppings, Extras)
│           └── modifiers (e.g., Extra Cheese $1.50)
│
├── combo_deals (meal bundles)
│   └── combo_components (items in bundle)
│       └── component_modifiers (customization rules)
│
└── ingredients (inventory/allergen tracking only)
    └── dish_ingredients (what's IN the dish, not modifiers)
```

### Key Simplifications:

1. **Modifiers are Direct, Not Ingredient-Based**
   ```sql
   -- BAD (Current):
   dish → dish_modifiers → ingredient_id → ingredient_groups
   
   -- GOOD (Target):
   dish → modifier_groups → modifier_items (name + price directly)
   ```

2. **Single Pricing Model**
   ```sql
   -- Remove: dishes.prices JSONB
   -- Remove: dishes.size_options JSONB
   -- Keep: dish_prices table (relational, clean)
   ```

3. **Remove tenant_id Everywhere**
   ```sql
   -- Use: restaurant_id (authoritative)
   -- Remove: tenant_id (redundant copy)
   ```

---

## 📋 Refactoring Plan - 7 Phases

### **Phase 1: Schema Simplification** (Week 1, Day 1-2)

**Goal:** Remove redundancy, consolidate to ONE system for each concern

#### ~~1.1 Remove tenant_id Column~~ ✅ **ALREADY COMPLETE**

**Status:** ✅ tenant_id has already been removed from the database schema!

**Verified (Supabase MCP):**
```sql
SELECT COUNT(*) FROM information_schema.columns
WHERE column_name = 'tenant_id' AND table_schema = 'menuca_v3';
-- Result: 0 tables (column is gone!)

-- dishes table verified - no tenant_id column ✅
```

**What This Means:**
- ✅ All 31 tables already cleaned
- ✅ Functions already updated to use restaurant_id
- ✅ No tenant_id data quality issues remain
- ✅ **Skip this entire sub-phase!**

---

#### 1.2 Consolidate Pricing to dish_prices Table

**Migration:**
```sql
-- Step 1: Migrate dishes.prices JSONB → dish_prices (5,130 dishes)
INSERT INTO menuca_v3.dish_prices (dish_id, size_variant, price, display_order)
SELECT 
    id as dish_id,
    jsonb_array_elements(prices)->>'code' as size_variant,
    (jsonb_array_elements(prices)->>'price')::NUMERIC as price,
    ROW_NUMBER() OVER (PARTITION BY id ORDER BY jsonb_array_elements(prices)) as display_order
FROM menuca_v3.dishes
WHERE prices IS NOT NULL
ON CONFLICT (dish_id, size_variant) DO UPDATE
SET price = EXCLUDED.price;

-- Step 2: Migrate dishes.base_price → dish_prices (single price dishes)
INSERT INTO menuca_v3.dish_prices (dish_id, size_variant, price, display_order)
SELECT 
    id,
    'default' as size_variant,
    base_price,
    0
FROM menuca_v3.dishes
WHERE base_price IS NOT NULL
  AND prices IS NULL
ON CONFLICT (dish_id, size_variant) DO UPDATE
SET price = EXCLUDED.price;

-- Step 3: Drop legacy columns
ALTER TABLE menuca_v3.dishes 
  DROP COLUMN prices,
  DROP COLUMN base_price,
  DROP COLUMN size_options;
```

**Result:** Single source of truth for pricing (dish_prices table)

---

#### 1.3 Remove Duplicate/Unused Tables

**Tables to Deprecate:**
```sql
-- These tables were created but never used:
DROP TABLE menuca_v3.dish_modifier_items CASCADE;  -- 0 rows
DROP TABLE menuca_v3.dish_modifier_groups CASCADE; -- 0 rows
-- Note: modifier_groups should be kept and USED (see Phase 2)
```

---

### **Phase 2: Modern Modifier System Migration** (Week 1, Day 3-5)

**Goal:** Replace ingredient-based modifiers with direct modifier system

#### 2.1 Understand Industry Standard

**How Uber Eats / DoorDash Do It:**

```
Dish: "Pepperoni Pizza"
├── Modifier Group: "Size" (required, select 1)
│   ├── Small - $12.99
│   ├── Medium - $15.99
│   └── Large - $18.99
│
├── Modifier Group: "Extra Toppings" (optional, select 0-5)
│   ├── Extra Cheese - $1.50
│   ├── Mushrooms - $1.00
│   ├── Olives - $1.00
│   └── Bacon - $2.00
│
└── Modifier Group: "Crust Type" (required, select 1)
    ├── Thin Crust - $0.00 (included)
    ├── Thick Crust - $1.00
    └── Stuffed Crust - $2.00
```

**Key Difference:**
- ❌ **OLD:** Modifiers reference ingredients table (complex, many JOINs)
- ✅ **NEW:** Modifiers are just name + price (simple, fast)

---

#### 2.2 Migration Strategy

**Step 1: Analyze dish_modifiers patterns**
```sql
-- Group dish_modifiers by common patterns
SELECT 
    dm.modifier_type,
    COUNT(*) as modifiers_count,
    COUNT(DISTINCT dm.dish_id) as dishes_affected
FROM menuca_v3.dish_modifiers dm
GROUP BY dm.modifier_type
ORDER BY modifiers_count DESC;
```

**Step 2: Create Modern Modifier Groups**
```sql
-- For each dish, create modifier groups
WITH dish_modifier_summary AS (
    SELECT DISTINCT
        dm.dish_id,
        dm.modifier_type,
        COALESCE(ig.name, dm.modifier_type) as group_name,
        ig.min_selection,
        ig.max_selection
    FROM menuca_v3.dish_modifiers dm
    LEFT JOIN menuca_v3.ingredient_groups ig 
        ON ig.id = dm.ingredient_group_id
)
INSERT INTO menuca_v3.modifier_groups (
    dish_id,
    name,
    is_required,
    min_selections,
    max_selections,
    display_order
)
SELECT 
    dish_id,
    group_name,
    min_selection > 0 as is_required,
    COALESCE(min_selection, 0),
    COALESCE(max_selection, 999),
    ROW_NUMBER() OVER (PARTITION BY dish_id ORDER BY modifier_type)
FROM dish_modifier_summary;
```

**Step 3: Migrate Modifiers to Direct System**
```sql
-- Create dish_modifiers as direct name + price (no ingredient reference)
INSERT INTO menuca_v3.dish_modifiers (
    dish_id,
    modifier_group_id,
    name,
    price,
    is_included,
    is_default,
    display_order
)
SELECT 
    dm.dish_id,
    mg.id as modifier_group_id,
    i.name as name,
    COALESCE(dmp.price, igi.base_price, 0.00) as price,
    dm.is_included,
    false as is_default,
    dm.display_order
FROM menuca_v3.dish_modifiers dm
JOIN menuca_v3.modifier_groups mg 
    ON mg.dish_id = dm.dish_id 
    AND mg.name = dm.modifier_type
LEFT JOIN menuca_v3.ingredients i ON i.id = dm.ingredient_id
LEFT JOIN menuca_v3.dish_modifier_prices dmp ON dmp.dish_modifier_id = dm.id
LEFT JOIN menuca_v3.ingredient_group_items igi 
    ON igi.ingredient_id = dm.ingredient_id 
    AND igi.ingredient_group_id = dm.ingredient_group_id;
```

**Step 4: Deprecate Old Systems**
```sql
-- Rename old tables for audit trail
ALTER TABLE menuca_v3.dish_modifiers RENAME TO dish_modifiers_legacy;
ALTER TABLE menuca_v3.dish_modifier_prices RENAME TO dish_modifier_prices_legacy;

-- Remove FK constraints to allow new schema
ALTER TABLE menuca_v3.dish_modifiers_legacy 
  DROP CONSTRAINT IF EXISTS dish_modifiers_ingredient_id_fkey CASCADE;
```

---

### **Phase 3: Normalize Group Type Codes** (Week 1, Day 5)

**Goal:** Replace 2-letter codes with full words

#### 3.1 Create Mapping

| Old Code | New Full Word | Description |
|----------|---------------|-------------|
| `ci` | `custom_ingredients` | Pizza toppings, burger add-ons |
| `e` | `extras` | Additional paid items |
| `sd` | `side_dishes` | Fries, coleslaw, salad |
| `d` | `drinks` | Soft drinks, juices |
| `sa` | `sauces` | Dipping sauces |
| `br` | `bread` | Bread types, crust |
| `dr` | `dressings` | Salad dressings |
| `cm` | `cooking_method` | Rare, medium, well done |

#### 3.2 Execute Update
```sql
UPDATE menuca_v3.ingredient_groups
SET group_type = CASE 
    WHEN group_type = 'ci' THEN 'custom_ingredients'
    WHEN group_type = 'e' THEN 'extras'
    WHEN group_type = 'sd' THEN 'side_dishes'
    WHEN group_type = 'd' THEN 'drinks'
    WHEN group_type = 'sa' THEN 'sauces'
    WHEN group_type = 'br' THEN 'bread'
    WHEN group_type = 'dr' THEN 'dressings'
    WHEN group_type = 'cm' THEN 'cooking_method'
    ELSE group_type
END
WHERE group_type IN ('ci', 'e', 'sd', 'd', 'sa', 'br', 'dr', 'cm');

-- Affected: 9,116 records
```

---

### **Phase 4: Combo System Completion** (Week 2, Day 1-2)

**Goal:** Enable multi-item meal deals

#### 4.1 Populate combo_steps Table

**Current State:**
- combo_groups: 8,234 rows ✅
- combo_items: 16,356 rows ✅
- combo_steps: 0 rows ❌

**Problem:** V2 combos had multi-step wizards (Pick Pizza → Pick Side → Pick Drink)

**Solution:**
```sql
-- Analyze combo_items to infer steps
WITH combo_structure AS (
    SELECT 
        combo_group_id,
        dish_id,
        ROW_NUMBER() OVER (PARTITION BY combo_group_id ORDER BY display_order) as inferred_step
    FROM menuca_v3.combo_items
    WHERE source_system = 'v2'
)
INSERT INTO menuca_v3.combo_steps (
    combo_item_id,
    step_number,
    step_label
)
SELECT 
    ci.id as combo_item_id,
    cs.inferred_step as step_number,
    CASE cs.inferred_step
        WHEN 1 THEN 'Choose your main'
        WHEN 2 THEN 'Pick a side'
        WHEN 3 THEN 'Select a drink'
        WHEN 4 THEN 'Add extras'
        ELSE 'Step ' || cs.inferred_step
    END as step_label
FROM combo_structure cs
JOIN menuca_v3.combo_items ci 
    ON ci.combo_group_id = cs.combo_group_id 
    AND ci.dish_id = cs.dish_id;
```

#### 4.2 Create Combo Business Logic Functions

**Function: calculate_combo_price**
```sql
CREATE OR REPLACE FUNCTION menuca_v3.calculate_combo_price(
    p_combo_group_id BIGINT,
    p_selected_items JSONB  -- {"dish_id": 123, "modifiers": [...]}
) RETURNS JSONB AS $$
DECLARE
    v_base_price NUMERIC;
    v_modifier_total NUMERIC := 0;
    v_final_price NUMERIC;
BEGIN
    -- Get combo base price
    SELECT combo_price INTO v_base_price
    FROM menuca_v3.combo_groups
    WHERE id = p_combo_group_id;
    
    -- Calculate modifier charges
    -- (Logic for combo_group_modifier_pricing)
    
    -- Return breakdown
    RETURN jsonb_build_object(
        'base_price', v_base_price,
        'modifier_charges', v_modifier_total,
        'final_price', v_base_price + v_modifier_total
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### **Phase 5: Ingredients Repurposing** (Week 2, Day 3)

**Goal:** Redefine ingredients as **what's IN the dish**, not modifiers

**Current Confusion:**
- Ingredients table used for BOTH:
  - ✅ What's in the dish ("contains chicken, garlic, ginger")
  - ❌ Modifiers ("add extra cheese")

**Industry Standard:**
- **Ingredients** = Allergen tracking, inventory, nutritional info
- **Modifiers** = Customer customization options

#### 5.1 Create New dish_ingredients Table

```sql
CREATE TABLE menuca_v3.dish_ingredients (
    id BIGSERIAL PRIMARY KEY,
    dish_id BIGINT NOT NULL REFERENCES menuca_v3.dishes(id) ON DELETE CASCADE,
    ingredient_id BIGINT NOT NULL REFERENCES menuca_v3.ingredients(id),
    quantity NUMERIC(10,3),  -- For recipes: "2 cups", "3 oz"
    unit VARCHAR(50),         -- "cups", "oz", "grams"
    is_allergen BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dish_id, ingredient_id)
);

COMMENT ON TABLE menuca_v3.dish_ingredients IS 
'Links dishes to their BASE ingredients (what is IN the dish). 
Used for: allergen warnings, nutritional info, inventory tracking. 
NOT for customization - use modifier_groups instead.';
```

#### 5.2 Repurpose Existing Ingredients

**Keep but Clarify:**
- `ingredients` table = ingredient library (Chicken, Tomatoes, Cheese, etc.)
- Use for allergen tracking, nutritional database
- **NOT for modifiers**

---

### **Phase 6: Create Enterprise Schema** (Week 2, Day 4-5)

**Goal:** Add missing enterprise features

#### 6.1 Size Options Table (Uber Eats Pattern)

```sql
CREATE TYPE menuca_v3.size_type AS ENUM ('single', 'small', 'medium', 'large', 'xlarge');

CREATE TABLE menuca_v3.dish_size_options (
    id BIGSERIAL PRIMARY KEY,
    dish_id BIGINT NOT NULL REFERENCES menuca_v3.dishes(id) ON DELETE CASCADE,
    size_code size_type NOT NULL,
    size_label VARCHAR(100) NOT NULL,  -- "12 inch", "16 inch", "20 inch"
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    calories INT,  -- Nutritional info
    is_default BOOLEAN DEFAULT false,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dish_id, size_code)
);

COMMENT ON TABLE menuca_v3.dish_size_options IS 
'Size variations for dishes (Small/Medium/Large). Replaces price_by_size JSONB with relational model.';
```

#### 6.2 Allergen Tracking

```sql
CREATE TYPE menuca_v3.allergen_type AS ENUM (
    'dairy', 'eggs', 'fish', 'shellfish', 
    'tree_nuts', 'peanuts', 'wheat', 'soy', 
    'sesame', 'gluten', 'sulfites'
);

CREATE TABLE menuca_v3.dish_allergens (
    id BIGSERIAL PRIMARY KEY,
    dish_id BIGINT NOT NULL REFERENCES menuca_v3.dishes(id) ON DELETE CASCADE,
    allergen allergen_type NOT NULL,
    severity VARCHAR(50) CHECK (severity IN ('contains', 'may_contain', 'prepared_with')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dish_id, allergen)
);
```

#### 6.3 Dietary Tags

```sql
CREATE TYPE menuca_v3.dietary_tag AS ENUM (
    'vegetarian', 'vegan', 'gluten_free', 
    'dairy_free', 'nut_free', 'halal', 
    'kosher', 'keto', 'low_carb', 'organic'
);

CREATE TABLE menuca_v3.dish_dietary_tags (
    id BIGSERIAL PRIMARY KEY,
    dish_id BIGINT NOT NULL REFERENCES menuca_v3.dishes(id) ON DELETE CASCADE,
    tag dietary_tag NOT NULL,
    is_certified BOOLEAN DEFAULT false,  -- Official certification vs self-reported
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dish_id, tag)
);
```

---

### **Phase 7: V1/V2 Logic Consolidation** (Week 3, Day 1-2)

**Goal:** Remove all source_system branching logic

#### 7.1 Audit All Functions for V1/V2 Logic

**Search for:**
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'menuca_v3'
  AND routine_definition ILIKE ANY(ARRAY['%source_system%', '%legacy_v1%', '%legacy_v2%']);
```

**Remove Logic Like:**
```sql
-- BAD (V1/V2 branching):
IF source_system = 'v1' THEN
    -- V1 logic
ELSIF source_system = 'v2' THEN
    -- V2 logic
END IF;

-- GOOD (Unified V3):
-- Just use V3 patterns, ignore source_system
-- Keep legacy_v1_id/legacy_v2_id for audit only
```

#### 7.2 Keep Legacy Tracking (Reference Only)

**Columns to KEEP:**
- `legacy_v1_id` - Historical reference, DO NOT use in queries
- `legacy_v2_id` - Historical reference, DO NOT use in queries
- `source_system` - Audit trail, DO NOT branch on it

**Add Comments:**
```sql
COMMENT ON COLUMN menuca_v3.dishes.legacy_v1_id IS
'⚠️ HISTORICAL REFERENCE ONLY - DO NOT USE IN BUSINESS LOGIC. 
This ID is from the legacy V1 system and should only be used for data archaeology/debugging.';
```

---

### **Phase 8: Security & RLS Enhancement** (Week 3, Day 3)

**Goal:** Ensure all new/modified tables have proper RLS

#### 8.1 RLS Policies for New Tables

**Pattern (Consistent across all entities):**
```sql
-- Enable RLS
ALTER TABLE menuca_v3.dish_size_options ENABLE ROW LEVEL SECURITY;

-- Public read (active items only)
CREATE POLICY "dish_sizes_public_read"
ON menuca_v3.dish_size_options FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM menuca_v3.dishes d
        WHERE d.id = dish_size_options.dish_id
          AND d.is_active = true
          AND d.deleted_at IS NULL
    )
);

-- Admin manage (via restaurant_id)
CREATE POLICY "dish_sizes_admin_manage"
ON menuca_v3.dish_size_options FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM menuca_v3.dishes d
        JOIN menuca_v3.admin_user_restaurants aur ON aur.restaurant_id = d.restaurant_id
        JOIN menuca_v3.admin_users au ON au.id = aur.admin_user_id
        WHERE d.id = dish_size_options.dish_id
          AND au.auth_user_id = auth.uid()
          AND au.status = 'active'
          AND au.deleted_at IS NULL
    )
);

-- Service role (full access)
CREATE POLICY "dish_sizes_service_role"
ON menuca_v3.dish_size_options FOR ALL
TO service_role
USING (true);
```

#### 8.2 Security Audit
```sql
-- Run Supabase MCP security advisor
-- Check for tables without RLS
-- Verify all policies use restaurant_id (NOT tenant_id)
```

---

### **Phase 9: Data Quality & Cleanup** (Week 3, Day 4)

**Goal:** Fix data issues, ensure consistency

#### 9.1 Fix Orphaned Records
```sql
-- Find dishes without courses (should have course_id)
SELECT COUNT(*) FROM menuca_v3.dishes WHERE course_id IS NULL;

-- Find modifiers without prices
SELECT COUNT(*) FROM menuca_v3.dish_modifiers WHERE base_price IS NULL AND price_by_size IS NULL;
```

#### 9.2 Standardize Names
```sql
-- Trim whitespace
UPDATE menuca_v3.dishes SET name = TRIM(name) WHERE name != TRIM(name);

-- Remove duplicates (same dish name in same restaurant)
-- Mark as deleted_at instead of hard delete
```

#### 9.3 Validate Foreign Keys
```sql
-- Ensure all FKs are valid
-- Run referential integrity checks
```

---

### **Phase 10: Performance Optimization** (Week 3, Day 5)

**Goal:** Enterprise-grade query performance

#### 10.1 Critical Indexes

```sql
-- Menu browsing (most common query)
CREATE INDEX CONCURRENTLY idx_dishes_restaurant_course_active 
ON menuca_v3.dishes(restaurant_id, course_id, is_active)
WHERE deleted_at IS NULL;

-- Dish search
CREATE INDEX CONCURRENTLY idx_dishes_search_vector_gin 
ON menuca_v3.dishes USING GIN(search_vector);

-- Modifier lookups
CREATE INDEX CONCURRENTLY idx_modifier_groups_dish_display 
ON menuca_v3.modifier_groups(dish_id, display_order);

-- Price lookups
CREATE INDEX CONCURRENTLY idx_dish_prices_dish_size 
ON menuca_v3.dish_prices(dish_id, size_variant);
```

#### 10.2 Materialized Views for Performance

```sql
-- Pre-computed menu with modifiers
CREATE MATERIALIZED VIEW menuca_v3.menu_catalog_complete AS
SELECT 
    r.id as restaurant_id,
    r.name as restaurant_name,
    c.id as course_id,
    c.name as course_name,
    d.id as dish_id,
    d.name as dish_name,
    d.description,
    jsonb_agg(DISTINCT dp.*) FILTER (WHERE dp.id IS NOT NULL) as prices,
    jsonb_agg(DISTINCT mg.*) FILTER (WHERE mg.id IS NOT NULL) as modifier_groups
FROM menuca_v3.restaurants r
JOIN menuca_v3.courses c ON c.restaurant_id = r.id
JOIN menuca_v3.dishes d ON d.course_id = c.id
LEFT JOIN menuca_v3.dish_prices dp ON dp.dish_id = d.id
LEFT JOIN menuca_v3.modifier_groups mg ON mg.dish_id = d.id
WHERE r.is_active = true
  AND c.is_active = true
  AND d.is_active = true
  AND r.deleted_at IS NULL
  AND c.deleted_at IS NULL
  AND d.deleted_at IS NULL
GROUP BY r.id, r.name, c.id, c.name, d.id, d.name, d.description;

-- Refresh trigger
CREATE OR REPLACE FUNCTION menuca_v3.refresh_menu_catalog()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY menuca_v3.menu_catalog_complete;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_menu_on_dish_change
AFTER INSERT OR UPDATE OR DELETE ON menuca_v3.dishes
FOR EACH STATEMENT EXECUTE FUNCTION menuca_v3.refresh_menu_catalog();
```

---

### **Phase 11: Backend API Functions** (Week 3, Day 5 - Week 4)

**Goal:** SQL functions for all menu operations

#### 11.1 Core Menu Functions

**Function 1: get_restaurant_menu**
```sql
CREATE OR REPLACE FUNCTION menuca_v3.get_restaurant_menu(
    p_restaurant_id BIGINT,
    p_language_code VARCHAR DEFAULT 'en'
) RETURNS JSONB AS $$
DECLARE
    v_menu JSONB;
BEGIN
    SELECT jsonb_build_object(
        'restaurant_id', p_restaurant_id,
        'courses', jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'name', COALESCE(ct.name, c.name),
                'description', COALESCE(ct.description, c.description),
                'display_order', c.display_order,
                'dishes', (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', d.id,
                            'name', COALESCE(dt.name, d.name),
                            'description', COALESCE(dt.description, d.description),
                            'prices', (
                                SELECT jsonb_agg(
                                    jsonb_build_object(
                                        'size', dp.size_variant,
                                        'price', dp.price
                                    ) ORDER BY dp.display_order
                                )
                                FROM menuca_v3.dish_prices dp
                                WHERE dp.dish_id = d.id AND dp.is_active = true
                            ),
                            'modifiers', (
                                SELECT jsonb_agg(
                                    jsonb_build_object(
                                        'group_id', mg.id,
                                        'group_name', mg.name,
                                        'min_selections', mg.min_selections,
                                        'max_selections', mg.max_selections,
                                        'options', (
                                            SELECT jsonb_agg(
                                                jsonb_build_object(
                                                    'id', dm.id,
                                                    'name', dm.name,
                                                    'price', dm.price,
                                                    'is_default', dm.is_default
                                                ) ORDER BY dm.display_order
                                            )
                                            FROM menuca_v3.dish_modifiers dm
                                            WHERE dm.modifier_group_id = mg.id
                                        )
                                    ) ORDER BY mg.display_order
                                )
                                FROM menuca_v3.modifier_groups mg
                                WHERE mg.dish_id = d.id
                            )
                        ) ORDER BY d.display_order
                    )
                    FROM menuca_v3.dishes d
                    LEFT JOIN menuca_v3.dish_translations dt 
                        ON dt.dish_id = d.id AND dt.language_code = p_language_code
                    WHERE d.course_id = c.id 
                      AND d.is_active = true
                      AND d.deleted_at IS NULL
                )
            ) ORDER BY c.display_order
        )
    ) INTO v_menu
    FROM menuca_v3.courses c
    LEFT JOIN menuca_v3.course_translations ct 
        ON ct.course_id = c.id AND ct.language_code = p_language_code
    WHERE c.restaurant_id = p_restaurant_id
      AND c.is_active = true
      AND c.deleted_at IS NULL;
    
    RETURN v_menu;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Function 2: validate_dish_customization**
```sql
CREATE OR REPLACE FUNCTION menuca_v3.validate_dish_customization(
    p_dish_id BIGINT,
    p_selected_modifiers JSONB  -- {group_id: [modifier_id, modifier_id]}
) RETURNS JSONB AS $$
-- Validates customer selections against min/max rules
-- Returns: {valid: true/false, errors: [...], total_price: X.XX}
$$;
```

**Function 3: calculate_dish_price**
```sql
CREATE OR REPLACE FUNCTION menuca_v3.calculate_dish_price(
    p_dish_id BIGINT,
    p_size_code VARCHAR,
    p_modifiers JSONB  -- [{modifier_id: 123, quantity: 1}]
) RETURNS NUMERIC AS $$
-- Calculates final price: base + size + modifiers
$$;
```

---

### **Phase 12: Multi-Language Enhancement** (Week 4, Day 1)

**Goal:** Ensure all user-facing text is translatable

#### 12.1 Expand Translation Coverage

**Current State:**
- `dish_translations`: 2 rows (almost none!)
- `course_translations`: 1 row (almost none!)
- `ingredient_translations`: 1 row (almost none!)

**Target:**
- Auto-translate all dishes to FR/ES using AI
- Or mark as "needs translation"

```sql
-- Identify dishes needing translation
SELECT 
    d.id,
    d.name,
    d.restaurant_id,
    COUNT(dt.id) as translation_count
FROM menuca_v3.dishes d
LEFT JOIN menuca_v3.dish_translations dt ON dt.dish_id = d.id
WHERE d.is_active = true AND d.deleted_at IS NULL
GROUP BY d.id, d.name, d.restaurant_id
HAVING COUNT(dt.id) < 3  -- Should have EN, FR, ES
ORDER BY d.restaurant_id;
```

---

### **Phase 13: Testing & Validation** (Week 4, Day 2-3)

**Goal:** Ensure refactored system works flawlessly

#### 13.1 Data Integrity Tests

```sql
-- Test 1: All dishes have prices
SELECT COUNT(*) 
FROM menuca_v3.dishes d
WHERE NOT EXISTS (
    SELECT 1 FROM menuca_v3.dish_prices dp WHERE dp.dish_id = d.id
)
AND d.is_active = true;
-- Should return 0

-- Test 2: All active dishes have at least one modifier group
SELECT COUNT(*)
FROM menuca_v3.dishes d
WHERE NOT EXISTS (
    SELECT 1 FROM menuca_v3.modifier_groups mg WHERE mg.dish_id = d.id
)
AND d.has_customization = true
AND d.is_active = true;
-- Should return 0 (or very few)

-- Test 3: No tenant_id columns remain
SELECT COUNT(*)
FROM information_schema.columns
WHERE table_schema = 'menuca_v3' 
  AND column_name = 'tenant_id';
-- Should return 0

-- Test 4: All modifier groups have modifiers
SELECT COUNT(*)
FROM menuca_v3.modifier_groups mg
WHERE NOT EXISTS (
    SELECT 1 FROM menuca_v3.dish_modifiers dm 
    WHERE dm.modifier_group_id = mg.id
);
-- Should return 0
```

#### 13.2 Performance Tests

```sql
-- Test query performance
EXPLAIN ANALYZE
SELECT * FROM menuca_v3.get_restaurant_menu(506, 'en');

-- Should complete in < 100ms for typical restaurant
```

#### 13.3 API Integration Tests

**Test Cases:**
1. Get full menu (all courses, all dishes, all modifiers)
2. Add dish to cart with modifiers
3. Calculate total price
4. Validate modifier selections (min/max rules)
5. Handle multi-language requests

---

### **Phase 14: Documentation & Handoff** (Week 4, Day 4-5)

**Goal:** Complete Santiago backend integration guide

#### 14.1 Create Santiago Guide

**File:** `/documentation/Menu & Catalog/SANTIAGO_REFACTORED_BACKEND_GUIDE.md`

**Contents:**
- New schema structure diagram
- All SQL functions with examples
- API endpoints to implement
- TypeScript integration code
- Real-time subscription patterns
- Testing checklist

#### 14.2 Update Memory Bank

Update: `/MEMORY_BANK/ENTITIES/05_MENU_CATALOG.md`

Mark refactoring complete, document new structure

---

## 🗺️ Architecture Comparison

### ❌ Current (Fragmented V1/V2 Hybrid)

```
Complexity Score: 9/10 🔴

dishes (23K rows)
├── Uses: base_price + prices JSONB + price_by_size
├── Has: tenant_id (31.58% wrong)
└── Modifiers via: dish_modifiers (428K rows)
    ├── References: ingredients table (32K rows)
    ├── References: ingredient_groups (9K rows)
    ├── Pricing: dish_modifier_prices (2.5K rows)
    └── Issue: 5 JOINs to get a modifier price

Problem: Too complex, too many tables, too many JOINs
```

### ✅ Target (Enterprise Clean)

```
Complexity Score: 3/10 🟢

dishes (23K rows)
├── Prices: dish_prices table (relational, clean)
├── No tenant_id (uses restaurant_id only)
└── Modifiers: modifier_groups → dish_modifiers
    ├── Direct: name + price (no ingredient reference)
    ├── Simple: 1 JOIN to get all modifiers
    └── Fast: Pre-computed, indexed

Benefit: Simple, fast, industry standard
```

---

## 📋 Implementation Checklist

### Week 1: Schema Simplification
- [x] ~~Remove tenant_id from 31 tables~~ **ALREADY DONE** ✅
- [x] ~~Update 10 functions to use restaurant_id~~ **ALREADY DONE** ✅
- [ ] Consolidate pricing to dish_prices table
- [ ] Drop dishes.prices, dishes.base_price, dishes.size_options
- [ ] Normalize ingredient_groups.group_type codes (9,116 records)
- [ ] Verify: No pricing inconsistencies

### Week 2: Modern Systems Migration
- [ ] Migrate dish_modifiers to direct name+price system
- [ ] Create modern modifier_groups (from patterns)
- [ ] Populate combo_steps table (16K combos)
- [ ] Create combo pricing functions
- [ ] Repurpose ingredients for allergen/nutrition tracking
- [ ] Create dish_ingredients junction table
- [ ] Verify: All dishes have modifiers migrated

### Week 3: V3 Consolidation & Security
- [ ] Remove all source_system branching from functions
- [ ] Add comments to legacy_v1_id/legacy_v2_id (reference only)
- [ ] Create RLS policies for all new tables
- [ ] Run Supabase security advisor
- [ ] Add allergen tracking tables
- [ ] Add dietary tags tables
- [ ] Verify: All queries use V3 patterns only

### Week 4: Testing, Documentation & Handoff
- [ ] Run all data integrity tests (13 tests)
- [ ] Performance test: <100ms menu load
- [ ] Create backend API functions (get_menu, validate, calculate)
- [ ] Multi-language testing
- [ ] Create SANTIAGO_REFACTORED_BACKEND_GUIDE.md
- [ ] Update MEMORY_BANK/ENTITIES/05_MENU_CATALOG.md
- [ ] Create completion report
- [ ] Supabase MCP final audit

---

## 🔧 Tools & Technologies

### Required:
- ✅ Supabase MCP (ALL phases)
- ✅ PostgreSQL 15+
- ✅ PostGIS (already installed)
- ✅ Supabase RLS
- ✅ Supabase Realtime

### Functions to Create:
1. `get_restaurant_menu()` - Full menu JSON
2. `calculate_dish_price()` - Price with modifiers
3. `validate_dish_customization()` - Check min/max rules
4. `calculate_combo_price()` - Combo pricing logic
5. `search_dishes()` - Full-text search
6. `get_dish_allergens()` - Allergen info
7. `update_dish_availability()` - Real-time inventory
8. `bulk_import_menu()` - Restaurant onboarding
9. `clone_menu_to_location()` - Franchise support
10. `translate_dish()` - Auto-translation helper

---

## ⚠️ Risks & Mitigation

### Risk 1: Data Loss During Migration
**Mitigation:**
- Create `*_legacy` backup tables before changes
- Test migration on copy first
- Maintain legacy_v1_id/legacy_v2_id for rollback

### Risk 2: Breaking Existing Queries
**Mitigation:**
- No live app yet! ✅
- Can completely redesign without risk
- Update all functions atomically

### Risk 3: Performance Regression
**Mitigation:**
- Benchmark before/after
- Add indexes before migrating data
- Use materialized views for complex queries

### Risk 4: Missing Data Mapping
**Mitigation:**
- Dry-run migrations first
- Validate FK integrity after each step
- Keep source_system for audit trail

---

## 📊 Success Criteria

### Data Quality:
- ✅ 0 dishes with incorrect/missing pricing
- ✅ 0 tenant_id columns in schema
- ✅ 100% of modifiers use modern direct system
- ✅ 0 legacy group_type codes

### Performance:
- ✅ Full menu load < 100ms (typical restaurant with 100 dishes)
- ✅ Modifier price calculation < 5ms
- ✅ Search results < 50ms

### Architecture:
- ✅ Single modifier system (modern only)
- ✅ Single pricing system (dish_prices table)
- ✅ No V1/V2 branching logic in functions
- ✅ RLS enabled on all tables
- ✅ All queries use restaurant_id (not tenant_id)

### Documentation:
- ✅ Santiago backend guide complete
- ✅ All SQL functions documented
- ✅ API examples provided
- ✅ Memory bank updated

---

## 🎯 Final Schema (Target State)

### Core Tables (Simplified):

```sql
-- MENU STRUCTURE
menuca_v3.courses (1,752)
  └── menuca_v3.dishes (23,006)
      ├── menuca_v3.dish_prices (size variants)
      ├── menuca_v3.modifier_groups (customization groups)
      │   └── menuca_v3.dish_modifiers (modifier options)
      ├── menuca_v3.dish_ingredients (what's IN the dish)
      ├── menuca_v3.dish_allergens (allergen warnings)
      └── menuca_v3.dish_dietary_tags (vegetarian, vegan, etc.)

-- COMBOS
menuca_v3.combo_groups (8,234)
  └── menuca_v3.combo_items (16,356)
      └── menuca_v3.combo_steps (multi-step wizard)

-- SUPPORTING DATA
menuca_v3.ingredients (32,031) - Allergen/nutrition database only
menuca_v3.ingredient_groups - DEPRECATED (data moved to modifier_groups)
```

### Removed/Deprecated:

```sql
-- REMOVED:
- tenant_id column (from 31 tables)
- dishes.prices JSONB
- dishes.base_price
- dishes.size_options
- ingredient_groups (merged into modifier_groups)
- dish_modifier_prices (merged into dish_modifiers.price)

-- RENAMED FOR AUDIT:
- dish_modifiers → dish_modifiers_legacy (backup)
- dish_modifier_prices → dish_modifier_prices_legacy (backup)
```

---

## 🚀 Quick Start for Santiago

### Before Starting:
1. Read this plan completely
2. Read `/documentation/Menu & Catalog/BUSINESS_RULES.md`
3. Review current schema via Supabase MCP
4. Create a development branch (or use existing cursor-build)

### Phase-by-Phase Approach:
1. **Start Small:** Phase 1 (tenant_id removal) - Low risk
2. **Test Each Phase:** Use Supabase MCP to verify
3. **Document as You Go:** Update completion status
4. **Backup Before Major Changes:** Create *_legacy tables

### Tools:
- Supabase MCP for all database operations
- VS Code with SQL highlighting
- Supabase Studio for schema visualization

---

## 💭 Questions to Resolve Before Starting

**Q1:** Should we completely remove `ingredient_groups` table?
- **Option A:** Keep for legacy reference, deprecate
- **Option B:** Migrate data to `modifier_groups`, then drop
- **Recommendation:** Option B (cleaner)

**Q2:** What to do with 802 dishes with no pricing?
- **Option A:** Delete (quality issue)
- **Option B:** Mark as inactive (preserve)
- **Option C:** Set default price $0.00 (investigate)
- **Recommendation:** Option B, then investigate

**Q3:** Should `combo_steps` be auto-inferred or manually configured?
- **Option A:** Auto-infer from display_order (faster)
- **Option B:** Manual configuration (more accurate)
- **Recommendation:** Option A with manual override ability

**Q4:** Keep or remove `dish_modifiers.ingredient_id` reference?
- **Current:** References ingredients table
- **Target:** Direct name + price (no FK to ingredients)
- **Recommendation:** Remove FK, add to dish_ingredients if needed for allergens

---

## 📅 Estimated Timeline

| Phase | Duration | Effort | Risk | Status |
|-------|----------|--------|------|--------|
| ~~1. Schema Simplification (tenant_id)~~ | ~~2 days~~ | ~~Medium~~ | ~~Low~~ | ✅ **DONE** |
| 2. Pricing Consolidation | 2 days | Medium | Low | Pending |
| 3. Modern Modifier Migration | 3 days | High | Medium | Pending |
| 4. Group Type Normalization | 1 day | Low | Low | Pending |
| 5. Combo System Completion | 2 days | Medium | Low | Pending |
| 6. Ingredients Repurposing | 1 day | Low | Low | Pending |
| 7. Enterprise Schema Additions | 2 days | Medium | Low | Pending |
| 8. V1/V2 Logic Removal | 1 day | Low | Low | Pending |
| 9. Security & RLS | 1 day | Medium | Medium | Pending |
| 10. Data Quality Cleanup | 1 day | Low | Low | Pending |
| 11. Performance Optimization | 1 day | Medium | Low | Pending |
| 12. Backend API Functions | 3 days | High | Medium | Pending |
| 13. Multi-Language | 1 day | Low | Low | Pending |
| 14. Testing & Validation | 2 days | Medium | Low | Pending |
| 15. Documentation | 1 day | Low | Low | Pending |

**Total:** ~~22~~ **20 working days** (~2.5 weeks) - 2 days saved! ✅

---

## ✅ Next Steps

1. **Santiago Review:** Read and approve this plan
2. **Create Branch:** Development branch or use cursor-build
3. **Start Phase 1:** tenant_id removal (safest first step)
4. **Use Supabase MCP:** All database operations
5. **Document Progress:** Update memory bank after each phase

---

**Status:** 📋 Ready for Review  
**Created By:** AI Database Architect  
**Approved By:** [Pending Santiago Review]  
**Start Date:** [TBD]  
**Target Completion:** [TBD + 3 weeks]

