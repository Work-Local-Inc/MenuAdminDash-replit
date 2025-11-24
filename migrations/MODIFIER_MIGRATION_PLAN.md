# Modifier Migration Plan - OLD System → NEW System

## Current Situation

### OLD SYSTEM (Active - 358K modifiers)
```
modifier_groups (22,632 groups)
├─ id                  → PRIMARY KEY
├─ dish_id            → Direct link to dishes
├─ name               → "Size", "Toppings", etc.
├─ is_required        → Boolean
├─ min_selections     → Integer
├─ max_selections     → Integer
└─ display_order      → Integer

dish_modifiers (358,499 modifiers)
├─ id                  → PRIMARY KEY
├─ dish_id            → Dish reference
├─ modifier_group_id  → FK to modifier_groups ⚠️
├─ name               → "Small", "Large", etc.
├─ price              → Decimal (direct pricing)
└─ modifier_type      → "bread", "custom_ingredients", etc.
```

### NEW SYSTEM (Empty - Needs Migration)
```
dish_modifier_groups (0 rows - NEW TABLE)
├─ id                  → PRIMARY KEY
├─ dish_id            → Direct link to dishes
├─ course_template_id → FK to templates (inheritance)
├─ name               → Group name
├─ is_required        → Boolean
├─ min_selections     → Integer
├─ max_selections     → Integer
├─ is_custom          → Boolean (inheritance flag)
└─ display_order      → Integer
```

## The Problem

**Foreign Key Mismatch:**
- `dish_modifiers.modifier_group_id` points to OLD `modifier_groups` table
- NEW system expects it to point to `dish_modifier_groups` table
- **Result:** 358K modifiers are orphaned from the new system

## Migration Strategy

### Phase 1: Data Migration (Copy OLD → NEW)
```sql
-- Step 1: Copy modifier_groups → dish_modifier_groups
INSERT INTO menuca_v3.dish_modifier_groups (
    dish_id,
    name,
    is_required,
    min_selections,
    max_selections,
    display_order,
    is_custom,
    created_at,
    updated_at
)
SELECT 
    dish_id,
    name,
    is_required,
    min_selections,
    max_selections,
    display_order,
    true AS is_custom,  -- Mark as custom (not inherited)
    created_at,
    updated_at
FROM menuca_v3.modifier_groups;
```

### Phase 2: Update Foreign Key References
```sql
-- Step 2: Create mapping table (old_id → new_id)
CREATE TEMP TABLE modifier_group_mapping AS
SELECT 
    mg.id as old_id,
    dmg.id as new_id
FROM menuca_v3.modifier_groups mg
INNER JOIN menuca_v3.dish_modifier_groups dmg 
    ON mg.dish_id = dmg.dish_id 
    AND mg.name = dmg.name;

-- Step 3: Update dish_modifiers to point to new groups
UPDATE menuca_v3.dish_modifiers dm
SET modifier_group_id = mapping.new_id
FROM modifier_group_mapping mapping
WHERE dm.modifier_group_id = mapping.old_id;
```

### Phase 3: Update Constraints (Switch FK Target)
```sql
-- Step 4: Drop old FK constraint
ALTER TABLE menuca_v3.dish_modifiers 
    DROP CONSTRAINT IF EXISTS fk_dish_modifier_group;

-- Step 5: Add new FK constraint to dish_modifier_groups
ALTER TABLE menuca_v3.dish_modifiers 
    ADD CONSTRAINT fk_dish_modifier_group 
    FOREIGN KEY (modifier_group_id) 
    REFERENCES menuca_v3.dish_modifier_groups(id) 
    ON DELETE CASCADE;
```

### Phase 4: Archive Old Table (Optional)
```sql
-- Step 6: Rename old table for backup
ALTER TABLE menuca_v3.modifier_groups 
    RENAME TO modifier_groups_archived;

-- Add comment
COMMENT ON TABLE menuca_v3.modifier_groups_archived IS 
'Archived modifier_groups table - migrated to dish_modifier_groups. Keep for historical reference.';
```

## Data Mapping Example

### Before Migration (OLD):
```
modifier_groups (id=123)
├─ dish_id: 456
├─ name: "Size"
└─ is_required: true

dish_modifiers (id=789)
├─ modifier_group_id: 123  → Points to modifier_groups
├─ name: "Large"
└─ price: 15.99
```

### After Migration (NEW):
```
dish_modifier_groups (id=9999)  ← NEW ROW
├─ dish_id: 456
├─ name: "Size"
├─ is_custom: true              ← Not inherited
└─ course_template_id: NULL

dish_modifiers (id=789)
├─ modifier_group_id: 9999      ← UPDATED to point to new table
├─ name: "Large"
└─ price: 15.99
```

## Key Decisions

### 1. Mark All Migrated Groups as `is_custom = true`
- **Reason:** Existing modifiers were created per-dish (old system)
- **Result:** They won't participate in template inheritance
- **Benefit:** No changes to existing menu behavior

### 2. Keep Old Table as Archive
- **Reason:** Safety - can rollback if needed
- **Result:** `modifier_groups_archived` table remains
- **Benefit:** Historical reference and audit trail

### 3. Gradual Template Adoption
- **Phase 1:** Migrate existing data (all custom)
- **Phase 2:** Create library templates for common patterns
- **Phase 3:** Gradually convert custom → inherited as needed

## Statistics

```
Current Data Volume:
├─ 22,632 modifier groups to migrate
├─ 358,499 individual modifiers to remap
├─ 9,482 dishes affected
└─ Estimated migration time: 2-5 minutes
```

## Verification Queries

### Check Migration Success:
```sql
-- Count before/after
SELECT 
    (SELECT COUNT(*) FROM modifier_groups) as old_count,
    (SELECT COUNT(*) FROM dish_modifier_groups) as new_count;

-- Verify FK integrity
SELECT COUNT(*) FROM dish_modifiers dm
LEFT JOIN dish_modifier_groups dmg ON dm.modifier_group_id = dmg.id
WHERE dmg.id IS NULL;  -- Should be 0
```

### Check No Data Loss:
```sql
-- Compare totals
SELECT 
    'OLD' as system,
    COUNT(*) as modifier_count
FROM dish_modifiers dm
JOIN modifier_groups_archived mg ON dm.modifier_group_id = mg.id

UNION ALL

SELECT 
    'NEW' as system,
    COUNT(*) as modifier_count
FROM dish_modifiers dm
JOIN dish_modifier_groups dmg ON dm.modifier_group_id = dmg.id;
```

## Next Steps

1. **Review this plan** with team
2. **Test on staging** database first
3. **Create migration script** (`012_migrate_modifiers.sql`)
4. **Run with transaction** (can rollback if issues)
5. **Verify data integrity** after migration
6. **Monitor production** for any issues

## Rollback Plan

If migration fails:
```sql
BEGIN;

-- Restore original FK references from backup
-- ...

ROLLBACK;
```

