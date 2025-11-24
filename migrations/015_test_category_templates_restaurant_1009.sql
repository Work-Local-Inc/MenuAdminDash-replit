-- ============================================================================
-- Migration 015: TEST - Create Category Templates for Restaurant 1009 Only
-- ============================================================================
-- Purpose: Safe test run on single restaurant (Econo Pizza)
-- Created: November 24, 2025
-- Schema: menuca_v3
--
-- CONSERVATIVE SETTINGS:
-- - Restaurant: 1009 (Econo Pizza) ONLY
-- - Threshold: 80% match minimum
-- - Expected: 1 template ("Sauces" for Pizzas category)
-- - Groups affected: 7 out of 9 total
--
-- SAFE: Single restaurant, high threshold, easily reversible
-- ============================================================================

SET search_path TO menuca_v3;

-- Verify we're only touching restaurant 1009
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST MIGRATION: Restaurant 1009 Only';
    RAISE NOTICE 'Threshold: 80%% match';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: Find Patterns (Restaurant 1009, 80% threshold)
-- ============================================================================

CREATE TEMP TABLE category_patterns_1009 AS
WITH category_totals AS (
    SELECT 
        c.id as course_id,
        c.name as category_name,
        COUNT(DISTINCT d.id) as total_dishes
    FROM courses c
    INNER JOIN dishes d ON d.course_id = c.id
    WHERE c.restaurant_id = 1009  -- ONLY restaurant 1009
    AND d.deleted_at IS NULL
    GROUP BY c.id, c.name
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
        ARRAY_AGG(DISTINCT mg.id) as group_ids,
        STRING_AGG(
            DISTINCT dm.name || ':' || COALESCE(dmp.price::text, '0'),
            '|' ORDER BY dm.name || ':' || COALESCE(dmp.price::text, '0')
        ) as modifier_signature
    FROM dishes d
    INNER JOIN modifier_groups mg ON mg.dish_id = d.id
    LEFT JOIN dish_modifiers dm ON dm.modifier_group_id = mg.id AND dm.deleted_at IS NULL
    LEFT JOIN dish_modifier_prices dmp ON dmp.dish_modifier_id = dm.id AND dmp.deleted_at IS NULL
    WHERE d.course_id IN (SELECT id FROM courses WHERE restaurant_id = 1009)
    AND d.deleted_at IS NULL
    AND mg.deleted_at IS NULL
    AND mg.course_template_id IS NULL
    GROUP BY d.course_id, mg.name, mg.is_required, mg.min_selections, mg.max_selections, mg.display_order
)
SELECT 
    gp.course_id,
    ct.category_name,
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
WHERE gp.dishes_with_this_group >= 3
AND gp.dishes_with_this_group::float / ct.total_dishes >= 0.80;  -- 80% threshold

-- Show preview
DO $$
DECLARE
    v_pattern RECORD;
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM category_patterns_1009;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Patterns found: %', v_count;
    RAISE NOTICE '';
    
    FOR v_pattern IN SELECT * FROM category_patterns_1009 ORDER BY match_percentage DESC
    LOOP
        RAISE NOTICE 'Category: % | Group: % | Match: %/% (%%%)',
            v_pattern.category_name,
            v_pattern.group_name,
            v_pattern.dishes_with_this_group,
            v_pattern.total_dishes,
            v_pattern.match_percentage;
    END LOOP;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 2: Create Category Templates
-- ============================================================================

DO $$
DECLARE
    v_pattern RECORD;
    v_new_template_id INTEGER;
    v_templates_created INTEGER := 0;
    v_groups_linked INTEGER := 0;
    v_modifier_group_id BIGINT;
    v_linked_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Category Templates';
    RAISE NOTICE '========================================';
    
    FOR v_pattern IN 
        SELECT * FROM category_patterns_1009 
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
            NULL
        )
        RETURNING id INTO v_new_template_id;
        
        v_templates_created := v_templates_created + 1;
        
        -- Get one example group to copy modifiers from
        SELECT id INTO v_modifier_group_id
        FROM modifier_groups
        WHERE id = ANY(v_pattern.group_ids)
        LIMIT 1;
        
        -- Copy modifiers to template
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
            false,
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
            is_custom = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY(v_pattern.group_ids);
        
        GET DIAGNOSTICS v_linked_count = ROW_COUNT;
        v_groups_linked := v_groups_linked + v_linked_count;
        
        RAISE NOTICE '✓ Created template "%" for category "%" (%% match, % groups linked)',
            v_pattern.group_name,
            v_pattern.category_name,
            v_pattern.match_percentage,
            v_linked_count;
            
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  Templates created: %', v_templates_created;
    RAISE NOTICE '  Groups linked: %', v_groups_linked;
    RAISE NOTICE '';
    
END $$;

-- ============================================================================
-- STEP 3: Verification
-- ============================================================================

DO $$
DECLARE
    v_templates INTEGER;
    v_linked INTEGER;
    v_custom INTEGER;
BEGIN
    -- Count templates for restaurant 1009 only
    SELECT COUNT(*) INTO v_templates 
    FROM course_modifier_templates cmt
    INNER JOIN courses c ON c.id = cmt.course_id
    WHERE c.restaurant_id = 1009
    AND cmt.deleted_at IS NULL;
    
    -- Count linked groups for restaurant 1009
    SELECT COUNT(*) INTO v_linked 
    FROM modifier_groups mg
    INNER JOIN dishes d ON d.id = mg.dish_id
    INNER JOIN courses c ON c.id = d.course_id
    WHERE c.restaurant_id = 1009
    AND mg.course_template_id IS NOT NULL
    AND mg.deleted_at IS NULL;
    
    -- Count custom groups remaining
    SELECT COUNT(*) INTO v_custom 
    FROM modifier_groups mg
    INNER JOIN dishes d ON d.id = mg.dish_id
    INNER JOIN courses c ON c.id = d.course_id
    WHERE c.restaurant_id = 1009
    AND mg.is_custom = true
    AND mg.deleted_at IS NULL;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verification (Restaurant 1009 Only):';
    RAISE NOTICE '  Category templates created: %', v_templates;
    RAISE NOTICE '  Groups now inheriting: %', v_linked;
    RAISE NOTICE '  Groups still custom: %', v_custom;
    RAISE NOTICE '========================================';
    
END $$;

-- Clean up
DROP TABLE IF EXISTS category_patterns_1009;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'To ROLLBACK if needed:';
    RAISE NOTICE '  1. Run: SELECT id, name FROM course_modifier_templates WHERE course_id IN (SELECT id FROM courses WHERE restaurant_id = 1009);';
    RAISE NOTICE '  2. Note template IDs';
    RAISE NOTICE '  3. DELETE FROM course_modifier_templates WHERE id IN (...);';
    RAISE NOTICE '  4. UPDATE modifier_groups SET course_template_id = NULL, is_custom = true WHERE ...;';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '✅ TEST Migration Complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'What to check:';
    RAISE NOTICE '  1. Go to restaurant 1009 menu in admin';
    RAISE NOTICE '  2. Verify "Pizzas" category dishes show correct sauces';
    RAISE NOTICE '  3. Try editing the template to see changes propagate';
    RAISE NOTICE '  4. If all looks good, run full migration with 80%% threshold';
    RAISE NOTICE '';
END $$;

RESET search_path;

