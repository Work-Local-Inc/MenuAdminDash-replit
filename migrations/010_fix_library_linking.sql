-- ============================================================================
-- Migration 010: Fix Library Linking - Stop Cloning Modifiers
-- ============================================================================
-- Purpose: Fix apply_template_to_dish to use TRUE LINKING instead of cloning
-- Created: November 21, 2025
-- Schema: menuca_v3
--
-- CRITICAL BUG FIX:
-- The apply_template_to_dish function was CLONING modifiers to dish_modifiers
-- This defeats the purpose of library linking - updates don't propagate
--
-- NEW APPROACH:
-- - Create dish_modifier_groups with course_template_id (tracks inheritance)
-- - DO NOT clone modifiers to dish_modifiers
-- - Modifiers are fetched via JOIN: dish → category template → library template
-- ============================================================================

SET search_path TO menuca_v3;

-- ----------------------------------------------------------------------------
-- Updated Function: apply_template_to_dish
-- ----------------------------------------------------------------------------
-- Creates dish modifier groups that LINK to category templates
-- NO LONGER CLONES modifiers - they are fetched via JOIN
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Verification Query
-- ----------------------------------------------------------------------------
-- Run this to verify the function was updated correctly:
-- SELECT prosrc FROM pg_proc WHERE proname = 'apply_template_to_dish';
-- The function should NOT contain "INSERT INTO dish_modifiers"
-- ============================================================================
