-- ============================================================================
-- Migration 012: Migrate Existing Modifiers to New System
-- ============================================================================
-- Purpose: Migrate 358K existing modifiers from OLD system to NEW system
-- Created: November 24, 2025
-- Schema: menuca_v3
--
-- What this does:
-- 1. Copies modifier_groups → dish_modifier_groups
-- 2. Updates dish_modifiers FK to point to new table
-- 3. Archives old modifier_groups table
--
-- IMPORTANT: This migration is CRITICAL - it moves 22,632 groups and 358,499 modifiers
-- ============================================================================

SET search_path TO menuca_v3;

-- ============================================================================
-- PHASE 1: Copy Modifier Groups to New Table
-- ============================================================================

DO $$
DECLARE
    v_groups_migrated INTEGER := 0;
    v_start_time TIMESTAMP := clock_timestamp();
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Phase 1: Migrating modifier groups';
    RAISE NOTICE '========================================';
    
    -- Copy all modifier groups to new table
    INSERT INTO dish_modifier_groups (
        dish_id,
        name,
        is_required,
        min_selections,
        max_selections,
        display_order,
        is_custom,
        course_template_id,
        created_at,
        updated_at,
        deleted_at
    )
    SELECT 
        mg.dish_id,
        mg.name,
        mg.is_required,
        mg.min_selections,
        mg.max_selections,
        mg.display_order,
        true AS is_custom,              -- All existing groups are custom (not inherited)
        NULL AS course_template_id,     -- Not linked to any template
        mg.created_at,
        mg.updated_at,
        NULL AS deleted_at              -- All active (modifier_groups doesn't have deleted_at)
    FROM modifier_groups mg
    ORDER BY mg.id;
    
    GET DIAGNOSTICS v_groups_migrated = ROW_COUNT;
    
    RAISE NOTICE '✓ Migrated % modifier groups in %', 
        v_groups_migrated, 
        clock_timestamp() - v_start_time;
    
END $$;

-- ============================================================================
-- PHASE 2: Create ID Mapping Table
-- ============================================================================

DO $$
DECLARE
    v_mappings_created INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Phase 2: Creating ID mapping';
    RAISE NOTICE '========================================';
    
    -- Create temporary mapping table (old_id → new_id)
    CREATE TEMP TABLE modifier_group_id_mapping AS
    WITH ranked_groups AS (
        SELECT 
            mg.id as old_id,
            dmg.id as new_id,
            ROW_NUMBER() OVER (PARTITION BY mg.id ORDER BY dmg.id) as rn
        FROM modifier_groups mg
        INNER JOIN dish_modifier_groups dmg 
            ON mg.dish_id = dmg.dish_id 
            AND mg.name = dmg.name
            AND mg.display_order = dmg.display_order
    )
    SELECT old_id, new_id
    FROM ranked_groups
    WHERE rn = 1;  -- Take first match if multiple (shouldn't happen but safety first)
    
    GET DIAGNOSTICS v_mappings_created = ROW_COUNT;
    
    RAISE NOTICE '✓ Created % ID mappings', v_mappings_created;
    
    -- Verify mapping completeness
    DECLARE
        v_unmapped_groups INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_unmapped_groups
        FROM modifier_groups mg
        LEFT JOIN modifier_group_id_mapping mapping ON mg.id = mapping.old_id
        WHERE mapping.old_id IS NULL;
        
        IF v_unmapped_groups > 0 THEN
            RAISE WARNING '⚠️  % modifier groups could not be mapped!', v_unmapped_groups;
        ELSE
            RAISE NOTICE '✓ All modifier groups successfully mapped';
        END IF;
    END;
    
END $$;

-- ============================================================================
-- PHASE 3: Update dish_modifiers Foreign Keys
-- ============================================================================

DO $$
DECLARE
    v_modifiers_updated INTEGER := 0;
    v_start_time TIMESTAMP := clock_timestamp();
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Phase 3: Updating dish_modifiers FKs';
    RAISE NOTICE '========================================';
    
    -- First, check current state
    DECLARE
        v_total_modifiers INTEGER;
        v_mapped_modifiers INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_total_modifiers FROM dish_modifiers;
        
        SELECT COUNT(*) INTO v_mapped_modifiers
        FROM dish_modifiers dm
        INNER JOIN modifier_group_id_mapping mapping ON dm.modifier_group_id = mapping.old_id;
        
        RAISE NOTICE 'Total modifiers: %', v_total_modifiers;
        RAISE NOTICE 'Modifiers to update: %', v_mapped_modifiers;
        
        IF v_mapped_modifiers < v_total_modifiers THEN
            RAISE WARNING '⚠️  % modifiers will NOT be updated (no mapping found)', 
                v_total_modifiers - v_mapped_modifiers;
        END IF;
    END;
    
    -- Drop the existing FK constraint to modifier_groups
    ALTER TABLE dish_modifiers 
        DROP CONSTRAINT IF EXISTS fk_dish_modifier_group;
    
    RAISE NOTICE '✓ Dropped old FK constraint';
    
    -- Update modifier_group_id to point to new dish_modifier_groups IDs
    -- This is the CRITICAL step - updating 358K rows
    UPDATE dish_modifiers dm
    SET modifier_group_id = mapping.new_id
    FROM modifier_group_id_mapping mapping
    WHERE dm.modifier_group_id = mapping.old_id;
    
    GET DIAGNOSTICS v_modifiers_updated = ROW_COUNT;
    
    RAISE NOTICE '✓ Updated % modifiers in %', 
        v_modifiers_updated,
        clock_timestamp() - v_start_time;
    
    -- Add new FK constraint to dish_modifier_groups
    ALTER TABLE dish_modifiers 
        ADD CONSTRAINT fk_dish_modifier_group 
        FOREIGN KEY (modifier_group_id) 
        REFERENCES dish_modifier_groups(id) 
        ON DELETE CASCADE;
    
    RAISE NOTICE '✓ Added new FK constraint to dish_modifier_groups';
    
END $$;

-- ============================================================================
-- PHASE 4: Archive Old Table
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Phase 4: Archiving old table';
    RAISE NOTICE '========================================';
    
    -- Rename old table for historical reference
    ALTER TABLE modifier_groups 
        RENAME TO modifier_groups_archived_20251124;
    
    COMMENT ON TABLE modifier_groups_archived_20251124 IS 
    'ARCHIVED: Original modifier_groups table migrated to dish_modifier_groups on 2025-11-24. Kept for historical reference and rollback capability. DO NOT USE.';
    
    RAISE NOTICE '✓ Archived old modifier_groups table';
    
END $$;

-- ============================================================================
-- PHASE 5: Verification
-- ============================================================================

DO $$
DECLARE
    v_archived_count INTEGER;
    v_new_count INTEGER;
    v_orphaned_modifiers INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Phase 5: Verification';
    RAISE NOTICE '========================================';
    
    -- Check group counts match
    SELECT COUNT(*) INTO v_archived_count FROM modifier_groups_archived_20251124;
    SELECT COUNT(*) INTO v_new_count FROM dish_modifier_groups;
    
    RAISE NOTICE 'Groups in archived table: %', v_archived_count;
    RAISE NOTICE 'Groups in new table: %', v_new_count;
    
    IF v_archived_count = v_new_count THEN
        RAISE NOTICE '✓ Group counts match perfectly';
    ELSE
        RAISE WARNING '⚠️  Group count mismatch! Archived: %, New: %', 
            v_archived_count, v_new_count;
    END IF;
    
    -- Check for orphaned modifiers
    SELECT COUNT(*) INTO v_orphaned_modifiers
    FROM dish_modifiers dm
    LEFT JOIN dish_modifier_groups dmg ON dm.modifier_group_id = dmg.id
    WHERE dmg.id IS NULL;
    
    IF v_orphaned_modifiers = 0 THEN
        RAISE NOTICE '✓ No orphaned modifiers - all FKs valid';
    ELSE
        RAISE WARNING '⚠️  Found % orphaned modifiers with invalid FKs!', v_orphaned_modifiers;
    END IF;
    
END $$;

-- ============================================================================
-- Clean up temporary table
-- ============================================================================

DROP TABLE IF EXISTS modifier_group_id_mapping;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Migration 012 Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  - Migrated modifier groups to dish_modifier_groups';
    RAISE NOTICE '  - Updated dish_modifiers FK references';
    RAISE NOTICE '  - Archived old modifier_groups table';
    RAISE NOTICE '  - All existing modifiers marked as custom (is_custom=true)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Verify menu builder displays modifiers correctly';
    RAISE NOTICE '  2. Create library templates for common modifier patterns';
    RAISE NOTICE '  3. Gradually convert custom → inherited as desired';
    RAISE NOTICE '';
    RAISE NOTICE 'Rollback: Restore from modifier_groups_archived_20251124 if needed';
    RAISE NOTICE '========================================';
END $$;

-- Reset search path
RESET search_path;

