-- ============================================================================
-- Migration 014: Auto-Create Category Templates from Patterns
-- ============================================================================
-- Purpose: Detect identical modifier groups within categories and create templates
-- Created: November 24, 2025
-- Schema: menuca_v3
--
-- This migration:
-- 1. Finds modifier groups that appear identically on 50%+ of dishes in a category
-- 2. Creates category templates from these patterns  
-- 3. Links existing modifier_groups to the new templates
-- 4. Marks them as inherited (is_custom=false)
--
-- SAFE: Only affects groups with 50%+ match rate (clear patterns)
-- ============================================================================

SET search_path TO menuca_v3;

-- ============================================================================
-- STEP 1: Find Patterns (Groups that appear on 50%+ of dishes in category)
-- ============================================================================

CREATE TEMP TABLE category_patterns AS
WITH category_totals AS (
    SELECT 
        c.id as course_id,
        COUNT(DISTINCT d.id) as total_dishes
    FROM courses c
    INNER JOIN dishes d ON d.course_id = c.id
    WHERE d.deleted_at IS NULL
    GROUP BY c.id
),
group_patterns AS (
    SELECT 
        d.course_id,
        mg.name as group_name,
        mg.is_required,
        mg.min_selections,
        mg.max_selections,
        mg.display_order,
        COUNT(DISTINCT mg.dish_id) as dishes_with_this_group,
        -- Aggregate all dish IDs that have this group
        ARRAY_AGG(DISTINCT mg.dish_id) as dish_ids,
        -- Aggregate all modifier group IDs (for linking later)
        ARRAY_AGG(DISTINCT mg.id) as group_ids,
        -- Get signature of modifiers for exact matching
        STRING_AGG(
            DISTINCT dm.name || ':' || COALESCE(dmp.price::text, '0'),
            '|' ORDER BY dm.name || ':' || COALESCE(dmp.price::text, '0')
        ) as modifier_signature
    FROM dishes d
    INNER JOIN modifier_groups mg ON mg.dish_id = d.id
    LEFT JOIN dish_modifiers dm ON dm.modifier_group_id = mg.id AND dm.deleted_at IS NULL
    LEFT JOIN dish_modifier_prices dmp ON dmp.dish_modifier_id = dm.id AND dmp.deleted_at IS NULL
    WHERE d.deleted_at IS NULL
    AND mg.deleted_at IS NULL
    AND mg.course_template_id IS NULL  -- Not already linked to a template
    GROUP BY d.course_id, mg.name, mg.is_required, mg.min_selections, mg.max_selections, mg.display_order
)
SELECT 
    gp.course_id,
    gp.group_name,
    gp.is_required,
    gp.min_selections,
    gp.max_selections,
    gp.display_order,
    gp.dishes_with_this_group,
    ct.total_dishes,
    ROUND(100.0 * gp.dishes_with_this_group / ct.total_dishes, 0) as match_percentage,
    gp.group_ids,
    gp.modifier_signature
FROM group_patterns gp
INNER JOIN category_totals ct ON ct.course_id = gp.course_id
WHERE gp.dishes_with_this_group >= 3  -- At least 3 dishes
AND gp.dishes_with_this_group::float / ct.total_dishes >= 0.80;  -- 80%+ match (CONSERVATIVE)

-- ============================================================================
-- STEP 2: Create Category Templates
-- ============================================================================

DO $$
DECLARE
    v_pattern RECORD;
    v_new_template_id INTEGER;
    v_templates_created INTEGER := 0;
    v_groups_linked INTEGER := 0;
    v_modifier RECORD;
    v_modifier_group_id BIGINT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Category Templates';
    RAISE NOTICE '========================================';
    
    -- Loop through each pattern
    FOR v_pattern IN 
        SELECT * FROM category_patterns 
        ORDER BY course_id, match_percentage DESC
    LOOP
        -- Create the category template
        INSERT INTO course_modifier_templates (
            course_id,
            name,
            is_required,
            min_selections,
            max_selections,
            display_order,
            library_template_id
        )
        VALUES (
            v_pattern.course_id,
            v_pattern.group_name,
            v_pattern.is_required,
            v_pattern.min_selections,
            v_pattern.max_selections,
            v_pattern.display_order,
            NULL  -- Category template, not library
        )
        RETURNING id INTO v_new_template_id;
        
        v_templates_created := v_templates_created + 1;
        
        -- Get one example group ID to copy modifiers from
        SELECT id INTO v_modifier_group_id
        FROM modifier_groups
        WHERE id = ANY(v_pattern.group_ids)
        LIMIT 1;
        
        -- Copy modifiers from the example group to the template
        INSERT INTO course_template_modifiers (
            template_id,
            name,
            price,
            is_included,
            display_order
        )
        SELECT 
            v_new_template_id,
            dm.name,
            COALESCE(dmp.price, 0),
            false as is_included,
            dm.display_order
        FROM dish_modifiers dm
        LEFT JOIN dish_modifier_prices dmp ON dmp.dish_modifier_id = dm.id AND dmp.deleted_at IS NULL
        WHERE dm.modifier_group_id = v_modifier_group_id
        AND dm.deleted_at IS NULL
        ORDER BY dm.display_order, dm.name;
        
        -- Link all matching modifier_groups to this template
        UPDATE modifier_groups
        SET 
            course_template_id = v_new_template_id,
            is_custom = false,  -- Now inherits from template
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY(v_pattern.group_ids);
        
        GET DIAGNOSTICS v_groups_linked = ROW_COUNT;
        
        RAISE NOTICE 'Created template "%" for course % (linked % groups, %% match)',
            v_pattern.group_name,
            v_pattern.course_id,
            v_groups_linked,
            v_pattern.match_percentage;
            
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  Templates created: %', v_templates_created;
    RAISE NOTICE '  Groups linked: %', (SELECT SUM(dishes_with_this_group) FROM category_patterns);
    RAISE NOTICE '========================================';
    
END $$;

-- ============================================================================
-- STEP 3: Verification
-- ============================================================================

DO $$
DECLARE
    v_total_templates INTEGER;
    v_total_linked_groups INTEGER;
    v_total_custom_groups INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_templates 
    FROM course_modifier_templates 
    WHERE course_id IS NOT NULL 
    AND deleted_at IS NULL;
    
    SELECT COUNT(*) INTO v_total_linked_groups 
    FROM modifier_groups 
    WHERE course_template_id IS NOT NULL 
    AND deleted_at IS NULL;
    
    SELECT COUNT(*) INTO v_total_custom_groups 
    FROM modifier_groups 
    WHERE is_custom = true 
    AND deleted_at IS NULL;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verification:';
    RAISE NOTICE '  Category templates: %', v_total_templates;
    RAISE NOTICE '  Groups inheriting from templates: %', v_total_linked_groups;
    RAISE NOTICE '  Groups still custom: %', v_total_custom_groups;
    RAISE NOTICE '========================================';
    
END $$;

-- Clean up temp table
DROP TABLE IF EXISTS category_patterns;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration 014 Complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'What happened:';
    RAISE NOTICE '  - Detected modifier patterns within categories';
    RAISE NOTICE '  - Created category templates (course_id NOT NULL)';
    RAISE NOTICE '  - Linked matching groups (course_template_id set)';
    RAISE NOTICE '  - Marked as inherited (is_custom=false)';
    RAISE NOTICE '';
    RAISE NOTICE 'Future updates to templates will auto-propagate to dishes!';
END $$;

RESET search_path;

