-- ============================================================================
-- Migration 011: Enable Library Templates (Combined)
-- ============================================================================
-- Purpose: 
--   Step 1: Make course_id nullable to enable global library templates
--   Step 2: Fix apply_template_to_dish to use TRUE LINKING instead of cloning
-- Created: November 24, 2025
-- Schema: menuca_v3
-- ============================================================================

SET search_path TO menuca_v3;

-- ============================================================================
-- STEP 1: Enable Library Template Column
-- ============================================================================
-- Make course_id nullable so templates can be global (not tied to a category)
ALTER TABLE course_modifier_templates ALTER COLUMN course_id DROP NOT NULL;

COMMENT ON COLUMN course_modifier_templates.course_id IS 
'Category ID - NULL for global library templates, NOT NULL for category-specific templates';

-- ============================================================================
-- STEP 2: Fix Database Function - Stop Cloning Modifiers
-- ============================================================================
-- CRITICAL BUG FIX:
-- The apply_template_to_dish function was CLONING modifiers to dish_modifiers
-- This defeats the purpose of library linking - updates don't propagate
--
-- NEW APPROACH:
-- - Create dish_modifier_groups with course_template_id (tracks inheritance)
-- - DO NOT clone modifiers to dish_modifiers
-- - Modifiers are fetched via JOIN: dish → category template → library template
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_template_to_dish(
    p_dish_id INTEGER,
    p_template_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_group_id INTEGER;
BEGIN
    -- Create dish modifier group from template
    INSERT INTO dish_modifier_groups (
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
            FROM dish_modifier_groups
            WHERE dish_id = p_dish_id
            AND deleted_at IS NULL
        ), 0),
        false  -- Not custom, inherited from template
    FROM course_modifier_templates t
    WHERE t.id = p_template_id
    AND t.deleted_at IS NULL
    RETURNING id INTO v_group_id;
    
    -- DO NOT CLONE MODIFIERS - they are fetched via JOIN through category template
    -- If category template has library_template_id, modifiers come from library
    -- Otherwise, modifiers come from category template's own modifiers
    -- This ensures updates to library groups propagate to all dishes automatically
    
    RETURN v_group_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_template_to_dish IS 
'Creates dish modifier groups that LINK to category templates via course_template_id. Modifiers are fetched via JOIN (not cloned). Updates to library groups propagate automatically.';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration 011 complete: Library Templates Enabled';
    RAISE NOTICE '   - course_id is now nullable (enables global library templates)';
    RAISE NOTICE '   - apply_template_to_dish fixed (no longer clones modifiers)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run: tsx scripts/migrate-to-library-linking.ts --confirm';
    RAISE NOTICE '2. Verify: tsx lib/supabase/check-migrations.ts';
END $$;

-- Reset search path
RESET search_path;

