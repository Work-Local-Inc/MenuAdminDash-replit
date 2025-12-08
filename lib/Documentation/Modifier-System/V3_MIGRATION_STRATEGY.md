# Menu.ca V1/V2 → V3 Hybrid Migration Strategy

## The Problem You're Solving

You have:
- **V1/V2 System**: `combo_groups` → `combo_group_sections` → `combo_modifier_groups` → `combo_modifiers` → `combo_modifier_prices`
- **Industry Standard**: `modifier_groups` → `modifiers` → `modifier_prices`
- **Need**: Keep legacy data working while adopting industry standards

## CRITICAL: Multi-Tenant Architecture
- **Each location has its OWN modifiers** - no global/shared modifiers
- **Restaurant owners only see their own data** - complete isolation
- **All tables include restaurant_id** - enforces tenant separation

## The Solution: Hybrid Approach

**Don't migrate everything at once. Run both systems in parallel.**

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPATIBILITY LAYER                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Single API: get_dish_modifiers(dish_id)                 │  │
│  │  ↓                                                         │  │
│  │  Returns unified structure from EITHER system             │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ↙                                            ↘           │
│  ┌──────────────────┐                    ┌──────────────────┐  │
│  │  V1/V2 Legacy    │                    │  V3 Industry     │  │
│  │  combo_groups    │←─── Mapping ────→  │  modifier_groups │  │
│  │  (Keep running)  │      Table         │  (New standard)  │  │
│  └──────────────────┘                    └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Your Section Types → Industry Standard Mapping

| V1/V2 section_type | Industry modifier_group | Display Pattern |
|-------------------|------------------------|-----------------|
| `bread` (br_id) | Crust Type, Bread Choice | Required, Exclusive |
| `custom_ingredients` (ci_id) | Toppings, Build Your Own | Optional, Multiple |
| `dressing` (dr_id) | Dressing, Dipping Sauce | Optional/Required, Exclusive |
| `sauce` (sa_id) | Sauce Selection | Required, Exclusive |
| `side_dish` (sd_id) | Choose Your Side | Required, Exclusive or Pick N |
| `extras` (e_id) | Add-ons, Extras | Optional, Multiple |
| `cooking_method` (cm_id) | Cooking Preference | Optional, Exclusive |

## Field Mapping Reference

### combo_groups → modifier_groups
```javascript
{
  // Direct maps
  restaurant_id: restaurant_id,
  source_id: source_id,
  
  // Derived from combo_group_sections
  name: combo_group_sections.use_header,
  section_type: combo_group_sections.section_type,
  display_order: combo_group_sections.display_order,
  
  // Calculated
  is_required: (combo_group_sections.min_selection > 0),
  is_exclusive: (combo_group_sections.max_selection === 1),
  min_selections: combo_group_sections.min_selection,
  max_selections: combo_group_sections.max_selection,
  free_quantity: combo_group_sections.free_items,
  
  // New fields
  source_system: 'v2',
  pricing_model: 'per_item' // default
}
```

### combo_modifier_groups + combo_modifiers → modifiers
```javascript
{
  // From combo_modifier_groups
  type_code: combo_modifier_groups.type_code,
  
  // From combo_modifiers
  name: combo_modifiers.name,
  display_order: combo_modifiers.display_order,
  source_id: combo_modifiers.source_id,
  
  // Pricing from combo_modifier_prices
  // → Goes into separate modifier_prices table
}
```

### combo_modifier_prices → modifier_prices
```javascript
{
  modifier_id: (new modifier.id),
  size_variant: combo_modifier_prices.size_variant,
  price: combo_modifier_prices.price
}
```

## Migration Phases

### Phase 1: Setup (Week 1)
✅ Create new V3 tables
✅ Create mapping table
✅ Create compatibility views
✅ Don't touch existing V1/V2 tables yet

### Phase 2: Parallel Running (Weeks 2-4)
✅ New restaurants → V3 native
✅ Existing restaurants → Still on V1/V2
✅ API reads from both via `get_dish_modifiers()` function
✅ Test V3 with 5-10 restaurants

### Phase 3: Gradual Migration (Months 2-3)
✅ Migrate 50 restaurants at a time
✅ Use `migrate_combo_group_to_modifier_group()` function
✅ Verify data integrity
✅ Keep both systems synced during transition

### Phase 4: Full Cutover (Month 4)
✅ All restaurants on V3
✅ Keep V1/V2 tables for historical reference
✅ Archive old data
✅ Remove compatibility layer (optional)

## Code Examples

### Example 1: Query works for BOTH old and new
```sql
-- This function abstracts which system is being used
SELECT * FROM get_dish_modifiers('dish-uuid');

-- Returns same structure whether data is in:
-- - Old: combo_groups/combo_modifiers
-- - New: modifier_groups/modifiers
-- - Both: Merged result
```

### Example 2: Create new V3 native modifier group
```sql
-- New restaurant uses industry standard directly
INSERT INTO modifier_groups (
    restaurant_id,
    name,
    section_type,
    is_required,
    is_exclusive,
    min_selections,
    max_selections,
    source_system
) VALUES (
    'new-rest-001',
    'Pizza Crust',
    'bread',
    true,
    true,
    1,
    1,
    'v3_native' -- This restaurant never touches combo_groups
);
```

### Example 3: Migrate existing restaurant
```sql
-- Migrate one combo_group with all its sections
SELECT migrate_combo_group_to_modifier_group('combo-group-uuid');

-- This creates:
-- - modifier_groups for each section
-- - modifiers from combo_modifiers
-- - modifier_prices from combo_modifier_prices
-- - Mapping records for tracking
```

### Example 4: Frontend API stays the same
```javascript
// Your frontend doesn't need to change
const modifiers = await fetch(`/api/dishes/${dishId}/modifiers`);

// Backend uses get_dish_modifiers() which reads from both systems
// Frontend receives consistent structure
```

## Key Advantages of This Approach

### ✅ Zero Downtime
- Both systems run simultaneously
- No big bang migration
- Rollback anytime

### ✅ Gradual Validation
- Test with small restaurants first
- Catch issues early
- Learn as you go

### ✅ Industry Standard API
- External integrations see standard terms
- Documentation uses standard names
- Easy to understand for new devs

### ✅ Keep Your Domain Logic
- section_type preserved (bread, sauce, etc.)
- Your business rules intact
- Historical data still accessible

## What Gets Better with V3

### Old Way (V1/V2):
```sql
-- Complex joins through 5 tables
SELECT * FROM combo_groups cg
JOIN combo_group_sections cgs ON cg.id = cgs.combo_group_id
JOIN combo_modifier_groups cmg ON cgs.id = cmg.combo_group_section_id
JOIN combo_modifiers cm ON cmg.id = cm.combo_modifier_group_id
JOIN combo_modifier_prices cmp ON cm.id = cmp.combo_modifier_id
WHERE cg.restaurant_id = 'rest-001';
```

### New Way (V3):
```sql
-- Clean, simple query
SELECT * FROM get_dish_modifiers('dish-uuid');

-- Or direct:
SELECT m.*, mp.price
FROM modifier_groups mg
JOIN modifier_group_items mgi ON mg.id = mgi.modifier_group_id
JOIN modifiers m ON mgi.modifier_id = m.id
JOIN modifier_prices mp ON m.id = mp.modifier_id
WHERE mg.restaurant_id = 'rest-001';
```

## Testing Strategy

### 1. Data Integrity Tests
```sql
-- Compare counts
SELECT 
    (SELECT COUNT(*) FROM combo_groups WHERE restaurant_id = 'rest-001') AS old_count,
    (SELECT COUNT(*) FROM modifier_groups WHERE restaurant_id = 'rest-001' AND source_system = 'v2') AS new_count;

-- Should match after migration
```

### 2. Price Validation
```sql
-- Ensure prices migrated correctly
WITH old_prices AS (
    SELECT cm.name, cmp.size_variant, cmp.price
    FROM combo_modifiers cm
    JOIN combo_modifier_prices cmp ON cm.id = cmp.combo_modifier_id
),
new_prices AS (
    SELECT m.name, mp.size_variant, mp.price
    FROM modifiers m
    JOIN modifier_prices mp ON m.id = mp.modifier_id
    WHERE m.source_id IS NOT NULL
)
SELECT * FROM old_prices
EXCEPT
SELECT * FROM new_prices;

-- Should return 0 rows if migration perfect
```

### 3. API Response Tests
```javascript
// Test that frontend gets same data
const oldResponse = await getModifiersLegacy(dishId);
const newResponse = await getModifiersV3(dishId);

assert.deepEqual(
    normalizeStructure(oldResponse),
    normalizeStructure(newResponse)
);
```

## Rollback Plan

If something goes wrong:

1. **Immediate**: Flip `source_system` filter in API
2. **Short-term**: Use mapping table to route to old system
3. **Long-term**: Keep old tables until 100% confident

```sql
-- Emergency rollback: Make API prefer old system
CREATE OR REPLACE FUNCTION get_dish_modifiers(p_dish_id UUID)
RETURNS TABLE (...) AS $$
BEGIN
    -- Check if migration flag is set
    IF EXISTS (SELECT 1 FROM system_config WHERE key = 'force_legacy_modifiers' AND value = 'true') THEN
        -- Route to old combo_groups system
        RETURN QUERY SELECT * FROM get_dish_modifiers_legacy(p_dish_id);
    ELSE
        -- Use new system (with fallback to legacy)
        RETURN QUERY SELECT * FROM get_dish_modifiers_v3(p_dish_id);
    END IF;
END;
$$ LANGUAGE plpgsql;
```

## Timeline Summary

```
Month 1: Setup + Parallel Systems
├─ Week 1: Create V3 tables, mapping, views
├─ Week 2: Build compatibility layer
├─ Week 3: Test with 2-3 new restaurants
└─ Week 4: Validate data integrity tools

Month 2-3: Gradual Migration
├─ Week 5-8: Migrate 10% of restaurants
├─ Week 9-12: Migrate remaining 90%
└─ Continuous monitoring and fixes

Month 4: Optimization
├─ Week 13: Performance tuning
├─ Week 14: Clean up mapping code
└─ Week 15-16: Documentation
```

## Decision: When to Use Which System?

| Scenario | Use System | Why |
|----------|------------|-----|
| New restaurant onboarding | V3 Native | Clean start, industry standard |
| Existing restaurant (not migrated) | V1/V2 Legacy | Don't break what works |
| Existing restaurant (migrated) | V3 (mapped from legacy) | Best of both worlds |
| External integrations | V3 API | Industry standard terms |
| Internal reports | Both | Unified view via compatibility layer |
