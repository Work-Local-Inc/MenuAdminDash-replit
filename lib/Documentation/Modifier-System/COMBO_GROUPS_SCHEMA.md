# V3 SCHEMA EXTENSION: COMBO GROUPS TABLE STRUCTURE

> Fully Normalized - No Redundant `restaurant_id` in child tables
> 
> **Last Updated:** 2025-12-08  
> **Test Restaurant:** Centertown Donair & Pizza (V3: 131, V1: 255)

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Hierarchy Diagram](#hierarchy-overview)
3. [Entity Relationship Diagram with PK/FK](#detailed-entity-relationship-diagram-with-pkfk)
4. [Table Definitions](#table-definitions)
5. [Real-World Example: Centertown Donair & Pizza](#real-world-example-centertown-donair--pizza)
6. [Section Types (ENUM Values)](#section-types-enum-values)
7. [SQL CREATE Statements](#sql-create-statements)

---

## OVERVIEW

The Combo Groups schema supports complex pizza/restaurant combo deals where:

- **One dish can have multiple combo groups** (e.g., "Large Pizza and Garlic Fingers" uses 3 different combo groups)
- **One combo group can be used by multiple dishes** (e.g., "Dips" combo group is shared across many dishes)
- **Each combo group has sections** (e.g., "Custom Ingredients", "Sauce", "Extras")
- **Each section has modifier groups** (e.g., "Pizza Toppings", "Premium Toppings")
- **Each modifier group has modifiers** (e.g., "Pepperoni", "Bacon", "Extra Cheese")
- **Each modifier can have size-based pricing** (e.g., Small: $1.25, Medium: $2.50, Large: $2.95)

### Scraped Data Summary (Centertown Donair & Pizza)

| Table | Records |
|-------|---------|
| combo_groups | 33 |
| combo_group_sections | 34 |
| combo_modifier_groups | 221 |
| combo_modifiers | 2,022 |
| combo_modifier_prices | 5,561 |
| dish_combo_groups | 39 |

---

## HIERARCHY OVERVIEW

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                          │
│                              ┌─────────────────┐                                         │
│                              │  COMBO_GROUPS   │◄── Only table with restaurant_id        │
│                              └────────┬────────┘                                         │
│                                       │                                                  │
│   ┌───────────────┐          N:M      │      1:N                                         │
│   │    DISHES     │◄─────────────────►│◄──────────────────┐                              │
│   └───────────────┘                   │                   │                              │
│         (via junction table)          │                   ▼                              │
│                              ┌────────┴────────┐ ┌────────────────────┐                  │
│                              │ DISH_COMBO_     │ │ COMBO_GROUP_       │                  │
│                              │ GROUPS          │ │ SECTIONS           │                  │
│                              └─────────────────┘ └────────┬───────────┘                  │
│                                                           │                              │
│                                                      1:N  │                              │
│                                                           ▼                              │
│                                                  ┌────────────────────┐                  │
│                                                  │COMBO_MODIFIER_GROUPS│                 │
│                                                  └────────┬───────────┘                  │
│                                                           │                              │
│                                                      1:N  │                              │
│                                                           ▼                              │
│                                                  ┌────────────────────┐                  │
│                                                  │  COMBO_MODIFIERS   │                  │
│                                                  └────────┬───────────┘                  │
│                                                           │                              │
│                                                      1:N  │                              │
│                                                           ▼                              │
│                                                  ┌────────────────────┐                  │
│                                                  │COMBO_MODIFIER_     │                  │
│                                                  │PRICES              │                  │
│                                                  └────────────────────┘                  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## DETAILED ENTITY RELATIONSHIP DIAGRAM WITH PK/FK

```
                    EXISTING TABLES                              NEW TABLES
                    ──────────────                               ──────────

┌───────────────────────────────────┐
│           RESTAURANTS             │
├───────────────────────────────────┤
│ 🔑 id (PK)                        │
│    legacy_v1_id                   │
│    name                           │
└─────────────────┬─────────────────┘
                  │
                  │ 1:N
                  ▼
┌───────────────────────────────────┐                    ┌───────────────────────────────────┐
│              DISHES               │                    │      COMBO_GROUPS                 │
├───────────────────────────────────┤                    ├───────────────────────────────────┤
│ 🔑 id (PK)                        │                    │ 🔑 id (PK)                        │
│ 🔗 restaurant_id (FK) ────────────┼─► RESTAURANTS.id   │ 🔗 restaurant_id (FK) ────────────┼─► RESTAURANTS.id
│    name                           │                    │    name TEXT NOT NULL             │
│    description                    │     N:M            │    number_of_items INT            │
│    hide_option_enabled BOOLEAN    │◄───────────────────│    display_header VARCHAR(255)    │
│    ...                            │   (via junction)   │    source_id INT                  │
│                                   │                    │    created_at TIMESTAMPTZ         │
│                                   │                    │    updated_at TIMESTAMPTZ         │
└─────────────────┬─────────────────┘                    │    deleted_at TIMESTAMPTZ         │
                  │                                      └─────────────────┬─────────────────┘
                  │                                                        │
      ┌───────────┴──────────────────────────────────────┐                 │
      │                                                  │                 │
      │ 1:N                                              │                 │
      ▼                                                  │                 │
┌─────────────────────┐       ┌──────────────────────────┴──────────────────────────────────┐
│    DISH_PRICES      │       │                    DISH_COMBO_GROUPS                        │
├─────────────────────┤       │                    (Junction Table for N:M)                 │
│ 🔑 id (PK)          │       ├─────────────────────────────────────────────────────────────┤
│ 🔗 dish_id (FK) ────┼─►     │ 🔑 id (PK)                                                  │
│    size_variant     │       │ 🔗 dish_id (FK) ────────────────────────────────────────────┼─► DISHES.id
│    price            │       │ 🔗 combo_group_id (FK) ─────────────────────────────────────┼─► COMBO_GROUPS.id
│    ...              │       │    is_active BOOLEAN DEFAULT TRUE                           │
└─────────────────────┘       │ UNIQUE(dish_id, combo_group_id)                             │
                              └─────────────────────────────────────────────────────────────┘
```

### Foreign Key Relationship Matrix

| Child Table | Foreign Key Column | References |
|-------------|-------------------|------------|
| combo_groups | restaurant_id | restaurants.id |
| dish_combo_groups | dish_id | dishes.id |
| dish_combo_groups | combo_group_id | combo_groups.id |
| combo_group_sections | combo_group_id | combo_groups.id |
| combo_modifier_groups | combo_group_section_id | combo_group_sections.id |
| combo_modifiers | combo_modifier_group_id | combo_modifier_groups.id |
| combo_modifier_prices | combo_modifier_id | combo_modifiers.id |

### FK Chain to Get Restaurant

```
combo_modifier_prices.combo_modifier_id
    └──► combo_modifiers.combo_modifier_group_id
             └──► combo_modifier_groups.combo_group_section_id
                      └──► combo_group_sections.combo_group_id
                               └──► combo_groups.restaurant_id ──► ✅
```

---

## TABLE DEFINITIONS

### Table 1: `combo_groups`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Unique identifier |
| restaurant_id | BIGINT | FK → restaurants.id, NOT NULL | Restaurant this combo belongs to |
| name | TEXT | NOT NULL | Name of the combo group (e.g., "1 Large 3 toppings") |
| number_of_items | INT | NULL | Number of items in the combo |
| display_header | VARCHAR(255) | NULL | Header displayed in UI |
| source_id | INT | NULL | V1 CRM identifier for upsert tracking |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |
| deleted_at | TIMESTAMPTZ | NULL | Soft delete timestamp |

### Table 2: `dish_combo_groups` (Junction Table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Unique identifier |
| dish_id | BIGINT | FK → dishes.id, NOT NULL | Dish linked to combo |
| combo_group_id | BIGINT | FK → combo_groups.id, NOT NULL | Combo group linked to dish |
| is_active | BOOLEAN | DEFAULT TRUE | Whether link is active |
| | | UNIQUE(dish_id, combo_group_id) | Prevent duplicates |

### Table 3: `combo_group_sections`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Unique identifier |
| combo_group_id | BIGINT | FK → combo_groups.id, NOT NULL | Parent combo group |
| section_type | TEXT | NOT NULL | Type code (bread, sauce, extras, etc.) |
| use_header | VARCHAR(255) | NOT NULL | Display header (e.g., "First 3 Toppings Free") |
| display_order | SMALLINT | NOT NULL | Order of display |
| free_items | SMALLINT | NOT NULL DEFAULT 0 | Number of free selections |
| min_selection | SMALLINT | NOT NULL DEFAULT 0 | Minimum required selections |
| max_selection | SMALLINT | NOT NULL DEFAULT 1 | Maximum allowed selections |
| is_active | BOOLEAN | NOT NULL DEFAULT FALSE | Whether section is active |

### Table 4: `combo_modifier_groups`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Unique identifier |
| combo_group_section_id | BIGINT | FK → combo_group_sections.id, NOT NULL | Parent section |
| name | TEXT | NOT NULL | Modifier group name (e.g., "Pizza Toppings") |
| type_code | TEXT | NULL | Internal type code |
| is_selected | BOOLEAN | DEFAULT FALSE | Whether this group is the default selection |
| source_id | INT | NULL | V1 CRM identifier for upsert tracking |

### Table 5: `combo_modifiers`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Unique identifier |
| combo_modifier_group_id | BIGINT | FK → combo_modifier_groups.id, NOT NULL | Parent modifier group |
| name | TEXT | NOT NULL | Modifier name (e.g., "Pepperoni", "Extra Cheese") |
| display_order | SMALLINT | DEFAULT 0 | Order of display |

### Table 6: `combo_modifier_prices`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Unique identifier |
| combo_modifier_id | BIGINT | FK → combo_modifiers.id, NOT NULL | Parent modifier |
| size_variant | TEXT | NULL | Size (e.g., "Small", "Medium", "Large", "Standard") |
| price | NUMERIC(10,2) | NOT NULL | Price for this size variant |

---

## REAL-WORLD EXAMPLE: CENTERTOWN DONAIR & PIZZA

### Example 1: Dish → Combo Groups (N:M Relationship)

The dish **"Large Pizza and One Garlic Fingers"** uses **3 combo groups**:

```
┌─────────────────────────────────────┐
│  DISH: Large Pizza and One          │
│        Garlic Fingers (ID: 133648)  │
└───────────────┬─────────────────────┘
                │
                │ Uses 3 Combo Groups via dish_combo_groups
                │
    ┌───────────┼───────────────────────────┐
    ▼           ▼                           ▼
┌─────────┐ ┌────────────────────┐ ┌──────────────────────┐
│  Dips   │ │ 1 Large 3 toppings │ │ Premium Toppings     │
│ (ID: 7) │ │ (ID: 20)           │ │ Large (ID: 22)       │
└─────────┘ └────────────────────┘ └──────────────────────┘
```

**Database records in `dish_combo_groups`:**

| dish_id | dish_name | combo_group_id | combo_group_name | is_active |
|---------|-----------|----------------|------------------|-----------|
| 133648 | Large Pizza and One Garlic Fingers | 20 | 1 Large 3 toppings | true |
| 133648 | Large Pizza and One Garlic Fingers | 22 | Premium Toppings Large | true |
| 133648 | Large Pizza and One Garlic Fingers | 7 | Dips | true |

---

### Example 2: Combo Group → Sections → Modifier Groups (1:N:N)

The combo group **"1 Large 3 toppings"** has **1 section** with **7 modifier groups**:

```
┌────────────────────────────────────────────────────────────────────────────┐
│  COMBO GROUP: "1 Large 3 toppings" (ID: 20)                                │
└───────────────────────────────────────┬────────────────────────────────────┘
                                        │
                                        │ 1:N
                                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  SECTION: custom_ingredients                                               │
│           use_header: "First 3 Toppings Free"                              │
│           free_items: 3                                                    │
└───────────────────────────────────────┬────────────────────────────────────┘
                                        │
                                        │ 1:N (7 modifier groups)
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
         ┌──────────────────┐ ┌──────────────────┐ ┌────────────────────────┐
         │ Pizza Toppings   │ │ Pizza Toppings   │ │ Premium Toppings       │
         │ (is_selected: F) │ │ without Premium  │ │ (is_selected: F)       │
         └──────────────────┘ │ (is_selected: T) │ └────────────────────────┘
                              └──────────────────┘
                                     ▲
                                     │
                              DEFAULT SELECTION
```

**Database records:**

| combo_group | section_type | use_header | free_items | modifier_group | is_selected |
|-------------|--------------|------------|------------|----------------|-------------|
| 1 Large 3 toppings | custom_ingredients | First 3 Toppings Free | 3 | Pizza Toppings | false |
| 1 Large 3 toppings | custom_ingredients | First 3 Toppings Free | 3 | Pizza Toppings without Premium | **true** |
| 1 Large 3 toppings | custom_ingredients | First 3 Toppings Free | 3 | Premium Toppings | false |
| 1 Large 3 toppings | custom_ingredients | First 3 Toppings Free | 3 | Burgers ing | false |
| 1 Large 3 toppings | custom_ingredients | First 3 Toppings Free | 3 | Pizza Toppings for Single Pizza | false |
| 1 Large 3 toppings | custom_ingredients | First 3 Toppings Free | 3 | Pizza Toppings without Premium for Single Pizza | false |
| 1 Large 3 toppings | custom_ingredients | First 3 Toppings Free | 3 | Premium Toppings for Single Pizza | false |

---

### Example 3: Modifiers with Size-Based Pricing

The **"Pizza Toppings"** modifier group contains modifiers with **different prices per size**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  MODIFIER GROUP: "Pizza Toppings"                                            │
└────────────────────────────────────────┬─────────────────────────────────────┘
                                         │
                                         │ 1:N (many modifiers)
         ┌───────────────────────────────┼───────────────────────────────┐
         ▼                               ▼                               ▼
┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
│ Bacon (ID:2168) │            │ Chicken (ID:2174)│           │Extra Cheese(2203)│
└────────┬────────┘            └────────┬────────┘            └────────┬────────┘
         │                              │                              │
         │ 1:N (3 prices)               │ 1:N (3 prices)               │ 1:N (3 prices)
         ▼                              ▼                              ▼
┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
│ Small:  $1.25   │            │ Small:  $1.50   │            │ Small:  $1.50   │
│ Medium: $2.50   │            │ Medium: $2.75   │            │ Medium: $2.75   │
│ Large:  $2.95   │            │ Large:  $3.75   │            │ Large:  $3.75   │
└─────────────────┘            └─────────────────┘            └─────────────────┘
```

**Database records in `combo_modifier_prices`:**

| modifier_id | modifier_name | size_variant | price |
|-------------|---------------|--------------|-------|
| 2168 | Bacon | Small | 1.25 |
| 2168 | Bacon | Medium | 2.50 |
| 2168 | Bacon | Large | 2.95 |
| 2174 | Chicken | Small | 1.50 |
| 2174 | Chicken | Medium | 2.75 |
| 2174 | Chicken | Large | 3.75 |
| 2203 | Extra Cheese | Small | 1.50 |
| 2203 | Extra Cheese | Medium | 2.75 |
| 2203 | Extra Cheese | Large | 3.75 |

---

### Example 4: Shared Combo Group (Dips)

The **"Dips"** combo group is shared by many dishes and has **1 section** with **3 modifier groups**:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  COMBO GROUP: "Dips" (ID: 7, source_id: 1494)                                 │
│  Linked to 8+ dishes                                                          │
└───────────────────────────────────────┬───────────────────────────────────────┘
                                        │
                                        │ 1:N
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  SECTION: sauce                                                               │
│           use_header: "Dips"                                                  │
└───────────────────────────────────────┬───────────────────────────────────────┘
                                        │
                                        │ 1:N
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
┌────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────────┐
│ Dips               │    │ Wings Sauces            │    │ Sauces For Jesica           │
│ (is_selected: T)   │    │ (is_selected: F)        │    │ Donair Poutine              │
└────────┬───────────┘    └─────────────────────────┘    │ (is_selected: F)            │
         │                                               └─────────────────────────────┘
         │ 1:N
         ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│  MODIFIERS:                                                                    │
│  • Creamy Garlic ($1.00)                                                       │
│  • Honey Garlic ($1.00)                                                        │
│  • Hot ($1.00)                                                                 │
│  • B.B.Q ($1.00)                                                               │
│  • Marinara ($1.00)                                                            │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## SECTION TYPES (ENUM VALUES)

| V1 HTML ID | section_type | Description | Example |
|------------|--------------|-------------|---------|
| br_id | bread | Bread, crust, wraps options | Thin Crust, Thick Crust, Gluten Free |
| ci_id | custom_ingredients | Toppings, ingredients customization | Pepperoni, Mushrooms, Extra Cheese |
| dr_id | dressing | Salad dressings, dipping options | Ranch, Italian, Caesar |
| sa_id | sauce | Pizza sauce, pasta sauce, dips | Marinara, Alfredo, Creamy Garlic |
| sd_id | side_dish | Side dish selections | Fries, Salad, Onion Rings |
| e_id | extras | Extra add-ons | Extra Cheese, Bacon Bits |
| cm_id | cooking_method | Cooking preferences | Well Done, Crispy, Light Bake |

---

## SQL CREATE STATEMENTS

```sql
-- Table 1: Combo Groups (only table with restaurant_id)
CREATE TABLE menuca_v3.combo_groups (
    id BIGSERIAL PRIMARY KEY,
    restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    number_of_items INT,
    display_header VARCHAR(255),
    source_id INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_combo_groups_restaurant ON menuca_v3.combo_groups(restaurant_id);
CREATE INDEX idx_combo_groups_source_id ON menuca_v3.combo_groups(restaurant_id, source_id);

-- Table 2: Junction table for Dish ↔ Combo Group (N:M)
CREATE TABLE menuca_v3.dish_combo_groups (
    id BIGSERIAL PRIMARY KEY,
    dish_id BIGINT NOT NULL REFERENCES menuca_v3.dishes(id) ON DELETE CASCADE,
    combo_group_id BIGINT NOT NULL REFERENCES menuca_v3.combo_groups(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(dish_id, combo_group_id)
);
CREATE INDEX idx_dish_combo_groups_dish ON menuca_v3.dish_combo_groups(dish_id);
CREATE INDEX idx_dish_combo_groups_combo ON menuca_v3.dish_combo_groups(combo_group_id);

-- Table 3: Combo Group Sections
CREATE TABLE menuca_v3.combo_group_sections (
    id BIGSERIAL PRIMARY KEY,
    combo_group_id BIGINT NOT NULL REFERENCES menuca_v3.combo_groups(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL,
    use_header VARCHAR(255) NOT NULL,
    display_order SMALLINT NOT NULL,
    free_items SMALLINT NOT NULL DEFAULT 0,
    min_selection SMALLINT NOT NULL DEFAULT 0,
    max_selection SMALLINT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_combo_group_sections_group ON menuca_v3.combo_group_sections(combo_group_id);

-- Table 4: Combo Modifier Groups
CREATE TABLE menuca_v3.combo_modifier_groups (
    id BIGSERIAL PRIMARY KEY,
    combo_group_section_id BIGINT NOT NULL REFERENCES menuca_v3.combo_group_sections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type_code TEXT,
    is_selected BOOLEAN DEFAULT FALSE,
    source_id INT
);
CREATE INDEX idx_combo_modifier_groups_section ON menuca_v3.combo_modifier_groups(combo_group_section_id);

-- Table 5: Combo Modifiers
CREATE TABLE menuca_v3.combo_modifiers (
    id BIGSERIAL PRIMARY KEY,
    combo_modifier_group_id BIGINT NOT NULL REFERENCES menuca_v3.combo_modifier_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order SMALLINT DEFAULT 0
);
CREATE INDEX idx_combo_modifiers_group ON menuca_v3.combo_modifiers(combo_modifier_group_id);

-- Table 6: Combo Modifier Prices
CREATE TABLE menuca_v3.combo_modifier_prices (
    id BIGSERIAL PRIMARY KEY,
    combo_modifier_id BIGINT NOT NULL REFERENCES menuca_v3.combo_modifiers(id) ON DELETE CASCADE,
    size_variant TEXT,
    price NUMERIC(10,2) NOT NULL
);
CREATE INDEX idx_combo_modifier_prices_modifier ON menuca_v3.combo_modifier_prices(combo_modifier_id);
```

---

## QUERY EXAMPLES

### Get all combo data for a dish

```sql
SELECT 
    d.name as dish_name,
    cg.name as combo_group,
    cgs.section_type,
    cgs.use_header,
    cgs.free_items,
    cmg.name as modifier_group,
    cm.name as modifier,
    cmp.size_variant,
    cmp.price
FROM menuca_v3.dishes d
JOIN menuca_v3.dish_combo_groups dcg ON dcg.dish_id = d.id
JOIN menuca_v3.combo_groups cg ON dcg.combo_group_id = cg.id
JOIN menuca_v3.combo_group_sections cgs ON cgs.combo_group_id = cg.id
JOIN menuca_v3.combo_modifier_groups cmg ON cmg.combo_group_section_id = cgs.id
JOIN menuca_v3.combo_modifiers cm ON cm.combo_modifier_group_id = cmg.id
JOIN menuca_v3.combo_modifier_prices cmp ON cmp.combo_modifier_id = cm.id
WHERE d.id = 133648  -- Large Pizza and One Garlic Fingers
  AND cmg.is_selected = TRUE
ORDER BY cg.name, cgs.display_order, cm.display_order, cmp.size_variant;
```

### Get restaurant from any child table

```sql
-- Starting from combo_modifier_prices, navigate to restaurant
SELECT r.name as restaurant
FROM menuca_v3.combo_modifier_prices cmp
JOIN menuca_v3.combo_modifiers cm ON cmp.combo_modifier_id = cm.id
JOIN menuca_v3.combo_modifier_groups cmg ON cm.combo_modifier_group_id = cmg.id
JOIN menuca_v3.combo_group_sections cgs ON cmg.combo_group_section_id = cgs.id
JOIN menuca_v3.combo_groups cg ON cgs.combo_group_id = cg.id
JOIN menuca_v3.restaurants r ON cg.restaurant_id = r.id
WHERE cmp.id = 12345;
```

---

## PLACEMENT SYSTEM (Pizza Half-and-Half Toppings)

**Added:** 2025-12-09

### Overview

The placement system enables pizza "half-and-half" functionality, allowing customers to place toppings on the whole pizza, left half, or right half.

### Table 7: `combo_modifier_placements`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Unique identifier |
| combo_modifier_id | BIGINT | FK → combo_modifiers.id, NOT NULL | Parent modifier |
| placement | TEXT | NOT NULL, CHECK IN ('whole', 'left', 'right') | Allowed placement option |
| UNIQUE | | (combo_modifier_id, placement) | Prevent duplicate placements |

### SQL CREATE Statement

```sql
CREATE TABLE menuca_v3.combo_modifier_placements (
    id BIGSERIAL PRIMARY KEY,
    combo_modifier_id BIGINT NOT NULL REFERENCES menuca_v3.combo_modifiers(id) ON DELETE CASCADE,
    placement TEXT NOT NULL CHECK (placement IN ('whole', 'left', 'right')),
    UNIQUE(combo_modifier_id, placement)
);
CREATE INDEX idx_combo_modifier_placements_modifier ON menuca_v3.combo_modifier_placements(combo_modifier_id);
```

### Order Storage

Orders store modifiers as JSONB in the `orders.items` column (Stripe orders) or `order_items.modifiers` column (cash orders). The placement is included in the modifier object:

```json
{
  "id": 2168,
  "name": "Pepperoni",
  "price": 2.50,
  "placement": "left"
}
```

If using a separate `order_item_modifiers` table, add the column:

```sql
ALTER TABLE menuca_v3.order_item_modifiers 
ADD COLUMN placement TEXT CHECK (placement IS NULL OR placement IN ('whole', 'left', 'right'));
```

### API Response Format

The `/api/customer/dishes/[id]/combo-modifiers` endpoint returns placements as an array:

```json
{
  "modifiers": [
    {
      "id": 2168,
      "name": "Pepperoni",
      "prices": [...],
      "placements": ["whole", "left", "right"]
    }
  ]
}
```

### UI Behavior

- When a modifier has non-empty `placements` array, a placement selector appears
- Default placement is "whole" if available, otherwise the first placement option
- Placement is displayed in cart as "Pepperoni (Left Half)" or "Pepperoni (Right Half)"
- Placement does NOT affect pricing (same price regardless of placement)

### Cart Storage

The `CartModifier` interface includes optional placement:

```typescript
interface CartModifier {
  id: number;
  name: string;
  price: number;
  placement?: 'whole' | 'left' | 'right';
}
```

Cart item IDs include placement in the hash, so "Pepperoni (Left)" and "Pepperoni (Right)" create separate cart items.
