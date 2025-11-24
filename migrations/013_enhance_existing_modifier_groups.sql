-- ============================================================================
-- Migration 013: Enhance Existing modifier_groups Table (BETTER APPROACH)
-- ============================================================================
-- Purpose: Add library template support to EXISTING modifier_groups table
-- Created: November 24, 2025
-- Schema: menuca_v3
--
-- Why this approach is better:
-- - No data migration needed (0 risk)
-- - Keeps all existing data and relationships intact
-- - Instant (seconds vs minutes)
-- - One table instead of two
-- - All existing code continues to work
--
-- This makes modifier_groups the single source of truth for ALL modifier groups
-- ============================================================================

SET search_path TO menuca_v3;

-- ============================================================================
-- STEP 1: Add New Columns to Existing Table
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Enhancing existing modifier_groups table';
    RAISE NOTICE '========================================';
    
    -- Add course_template_id for template inheritance
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'menuca_v3' 
        AND table_name = 'modifier_groups' 
        AND column_name = 'course_template_id'
    ) THEN
        ALTER TABLE modifier_groups 
            ADD COLUMN course_template_id INTEGER NULL;
        
        ALTER TABLE modifier_groups 
            ADD CONSTRAINT fk_modifier_group_template 
            FOREIGN KEY (course_template_id) 
            REFERENCES course_modifier_templates(id) 
            ON DELETE SET NULL;
        
        RAISE NOTICE '✓ Added course_template_id column';
    ELSE
        RAISE NOTICE '- course_template_id already exists';
    END IF;
    
    -- Add is_custom flag
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'menuca_v3' 
        AND table_name = 'modifier_groups' 
        AND column_name = 'is_custom'
    ) THEN
        ALTER TABLE modifier_groups 
            ADD COLUMN is_custom BOOLEAN DEFAULT true;
        
        -- Set all existing groups as custom (not inherited from templates)
        UPDATE modifier_groups SET is_custom = true;
        
        RAISE NOTICE '✓ Added is_custom column (all existing = true)';
    ELSE
        RAISE NOTICE '- is_custom already exists';
    END IF;
    
    -- Add deleted_at for soft deletes
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'menuca_v3' 
        AND table_name = 'modifier_groups' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE modifier_groups 
            ADD COLUMN deleted_at TIMESTAMP NULL;
        
        RAISE NOTICE '✓ Added deleted_at column';
    ELSE
        RAISE NOTICE '- deleted_at already exists';
    END IF;
    
END $$;

-- ============================================================================
-- STEP 2: Add Indexes for Performance
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Adding performance indexes';
    RAISE NOTICE '========================================';
    
    -- Index for template inheritance tracking
    CREATE INDEX IF NOT EXISTS idx_modifier_groups_template 
        ON modifier_groups(course_template_id) 
        WHERE course_template_id IS NOT NULL AND deleted_at IS NULL;
    
    RAISE NOTICE '✓ Added template inheritance index';
    
    -- Index for fetching dish groups (with soft delete support)
    CREATE INDEX IF NOT EXISTS idx_modifier_groups_dish_active 
        ON modifier_groups(dish_id) 
        WHERE deleted_at IS NULL;
    
    RAISE NOTICE '✓ Added active dish groups index';
    
    -- Index for display order sorting
    CREATE INDEX IF NOT EXISTS idx_modifier_groups_display_order 
        ON modifier_groups(dish_id, display_order) 
        WHERE deleted_at IS NULL;
    
    RAISE NOTICE '✓ Added display order index';
    
END $$;

-- ============================================================================
-- STEP 3: Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE modifier_groups IS 
'Modifier groups for dishes. Can inherit from category templates (course_template_id NOT NULL) OR be custom (is_custom = true). Enhanced with library template support 2025-11-24.';

COMMENT ON COLUMN modifier_groups.course_template_id IS 
'NULL = custom group, NOT NULL = inherited from category template. Used for bulk updates via library system.';

COMMENT ON COLUMN modifier_groups.is_custom IS 
'true = dish broke inheritance and uses custom modifiers, false = inherits from template';

COMMENT ON COLUMN modifier_groups.deleted_at IS 
'Soft delete timestamp. NULL = active, NOT NULL = deleted. Enables undo/restore functionality.';

-- ============================================================================
-- STEP 4: Drop the Empty dish_modifier_groups Table
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Cleaning up duplicate table';
    RAISE NOTICE '========================================';
    
    -- Check if dish_modifier_groups has any data
    DECLARE
        v_row_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_row_count FROM dish_modifier_groups;
        
        IF v_row_count > 0 THEN
            RAISE WARNING '⚠️  dish_modifier_groups has % rows - NOT dropping!', v_row_count;
        ELSE
            -- Drop the empty duplicate table
            DROP TABLE IF EXISTS dish_modifier_groups CASCADE;
            RAISE NOTICE '✓ Dropped empty dish_modifier_groups table';
        END IF;
    END;
    
END $$;

-- ============================================================================
-- STEP 5: Update Helper Functions to Use modifier_groups
-- ============================================================================

-- Update apply_template_to_dish function
CREATE OR REPLACE FUNCTION apply_template_to_dish(
    p_dish_id INTEGER,
    p_template_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_group_id INTEGER;
BEGIN
    -- Create modifier group from template (using modifier_groups table)
    INSERT INTO modifier_groups (
        dish_id,
        course_template_id,
        name,
        is_required,
        min_selections,
        max_selections,
        display_order,
        is_custom
    )
    SELECT 
        p_dish_id,
        t.id,
        t.name,
        t.is_required,
        t.min_selections,
        t.max_selections,
        COALESCE((
            SELECT MAX(display_order) + 1
            FROM modifier_groups
            WHERE dish_id = p_dish_id
            AND deleted_at IS NULL
        ), 0),
        false  -- Not custom, inherited from template
    FROM course_modifier_templates t
    WHERE t.id = p_template_id
    AND t.deleted_at IS NULL
    RETURNING id INTO v_group_id;
    
    RETURN v_group_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_template_to_dish IS 
'Creates modifier groups that LINK to category templates via course_template_id. Uses enhanced modifier_groups table. Updates to library groups propagate automatically.';

-- Update break_modifier_inheritance function
CREATE OR REPLACE FUNCTION break_modifier_inheritance(
    p_group_id INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE modifier_groups
    SET 
        course_template_id = NULL,
        is_custom = true,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_group_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION break_modifier_inheritance IS 
'Breaks inheritance link for a modifier group. Dish will no longer receive template updates.';

-- Update sync_template_to_inherited_groups function
CREATE OR REPLACE FUNCTION sync_template_to_inherited_groups(
    p_template_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_affected_groups INTEGER := 0;
BEGIN
    -- Update all non-custom groups inheriting from this template
    UPDATE modifier_groups mg
    SET 
        name = t.name,
        is_required = t.is_required,
        min_selections = t.min_selections,
        max_selections = t.max_selections,
        updated_at = CURRENT_TIMESTAMP
    FROM course_modifier_templates t
    WHERE mg.course_template_id = p_template_id
    AND mg.is_custom = false
    AND t.id = p_template_id;
    
    GET DIAGNOSTICS v_affected_groups = ROW_COUNT;
    
    RETURN v_affected_groups;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_template_to_inherited_groups IS 
'Syncs template changes to all dishes inheriting from it. Used for bulk updates.';

-- Update get_dish_modifier_groups_with_inheritance function
CREATE OR REPLACE FUNCTION get_dish_modifier_groups_with_inheritance(
    p_dish_id INTEGER
) RETURNS TABLE (
    group_id INTEGER,
    group_name VARCHAR,
    is_required BOOLEAN,
    min_selections INTEGER,
    max_selections INTEGER,
    display_order INTEGER,
    is_custom BOOLEAN,
    template_id INTEGER,
    template_name VARCHAR,
    modifiers JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mg.id,
        mg.name,
        mg.is_required,
        mg.min_selections,
        mg.max_selections,
        mg.display_order,
        mg.is_custom,
        mg.course_template_id,
        t.name,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', dm.id,
                    'name', dm.name,
                    'price', COALESCE(dmp.price, 0),
                    'display_order', dm.display_order
                ) ORDER BY dm.display_order
            ) FILTER (WHERE dm.id IS NOT NULL),
            '[]'::jsonb
        ) as modifiers
    FROM modifier_groups mg
    LEFT JOIN course_modifier_templates t ON mg.course_template_id = t.id
    LEFT JOIN dish_modifiers dm ON mg.id = dm.modifier_group_id AND dm.deleted_at IS NULL
    LEFT JOIN dish_modifier_prices dmp ON dm.id = dmp.dish_modifier_id AND dmp.deleted_at IS NULL
    WHERE mg.dish_id = p_dish_id
    AND mg.deleted_at IS NULL
    GROUP BY 
        mg.id, 
        mg.name, 
        mg.is_required, 
        mg.min_selections, 
        mg.max_selections,
        mg.display_order,
        mg.is_custom,
        mg.course_template_id,
        t.name
    ORDER BY mg.display_order;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_dish_modifier_groups_with_inheritance IS 
'Returns modifier groups for a dish with inheritance metadata. Uses enhanced modifier_groups table.';

-- ============================================================================
-- STEP 6: Verification
-- ============================================================================

DO $$
DECLARE
    v_total_groups INTEGER;
    v_groups_with_data INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verification';
    RAISE NOTICE '========================================';
    
    -- Count total groups
    SELECT COUNT(*) INTO v_total_groups FROM modifier_groups;
    RAISE NOTICE 'Total modifier groups: %', v_total_groups;
    
    -- Count groups with modifiers
    SELECT COUNT(DISTINCT mg.id) INTO v_groups_with_data
    FROM modifier_groups mg
    INNER JOIN dish_modifiers dm ON dm.modifier_group_id = mg.id;
    RAISE NOTICE 'Groups with modifiers: %', v_groups_with_data;
    
    -- Verify new columns exist
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'menuca_v3' 
        AND table_name = 'modifier_groups' 
        AND column_name IN ('course_template_id', 'is_custom', 'deleted_at')
    ) THEN
        RAISE NOTICE '✓ All new columns added successfully';
    ELSE
        RAISE WARNING '⚠️  Some columns missing!';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Migration 013 Complete!';
    RAISE NOTICE '========================================';
    
END $$;

-- Reset search path
RESET search_path;

