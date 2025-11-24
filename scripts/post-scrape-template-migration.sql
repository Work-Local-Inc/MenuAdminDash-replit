-- ============================================================================
-- Post-Scrape Template Migration
-- ============================================================================
-- Purpose: Run after scraping a new restaurant to create category templates
-- Usage: Replace @RESTAURANT_ID with actual restaurant ID
-- ============================================================================

SET search_path TO menuca_v3;

-- ============================================================================
-- STEP 1: Detect patterns for specific restaurant (80% threshold)
-- ============================================================================

CREATE TEMP TABLE new_restaurant_patterns AS
WITH category_totals AS (
    SELECT 
        c.id as course_id,
        c.name as category_name,
        COUNT(DISTINCT d.id) as total_dishes
    FROM courses c
    INNER JOIN dishes d ON d.course_id = c.id
    WHERE c.restaurant_id = @RESTAURANT_ID  -- SET THIS
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
        ARRAY_AGG(DISTINCT mg.id) as group_ids
    FROM dishes d
    INNER JOIN modifier_groups mg ON mg.dish_id = d.id
    WHERE d.course_id IN (SELECT id FROM courses WHERE restaurant_id = @RESTAURANT_ID)
    AND d.deleted_at IS NULL
    AND mg.deleted_at IS NULL
    AND mg.course_template_id IS NULL
    GROUP BY d.course_id, mg.name, mg.is_required, mg.min_selections, mg.max_selections, mg.display_order
)
SELECT 
    gp.*,
    ct.category_name,
    ct.total_dishes,
    ROUND(100.0 * gp.dishes_with_this_group / ct.total_dishes, 0) as match_percentage
FROM group_patterns gp
INNER JOIN category_totals ct ON ct.course_id = gp.course_id
WHERE gp.dishes_with_this_group::float / ct.total_dishes >= 0.80;

-- Show preview
DO $$
DECLARE
    v_pattern RECORD;
BEGIN
    RAISE NOTICE 'Patterns detected for restaurant %:', @RESTAURANT_ID;
    FOR v_pattern IN SELECT * FROM new_restaurant_patterns ORDER BY match_percentage DESC
    LOOP
        RAISE NOTICE '  % | % | %/%% match',
            v_pattern.category_name,
            v_pattern.group_name,
            v_pattern.dishes_with_this_group,
            v_pattern.total_dishes;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Create category templates
-- ============================================================================

DO $$
DECLARE
    v_pattern RECORD;
    v_new_template_id INTEGER;
    v_example_group_id BIGINT;
BEGIN
    FOR v_pattern IN SELECT * FROM new_restaurant_patterns
    LOOP
        -- Create template
        INSERT INTO course_modifier_templates (
            course_id, name, is_required, 
            min_selections, max_selections, display_order
        )
        VALUES (
            v_pattern.course_id, v_pattern.group_name, v_pattern.is_required,
            v_pattern.min_selections, v_pattern.max_selections, v_pattern.display_order
        )
        RETURNING id INTO v_new_template_id;
        
        -- Get example group to copy modifiers from
        v_example_group_id := (v_pattern.group_ids)[1];
        
        -- Copy modifiers
        INSERT INTO course_template_modifiers (
            template_id, name, price, display_order
        )
        SELECT 
            v_new_template_id,
            dm.name,
            COALESCE(dmp.price, 0),
            dm.display_order
        FROM dish_modifiers dm
        LEFT JOIN dish_modifier_prices dmp ON dmp.dish_modifier_id = dm.id
        WHERE dm.modifier_group_id = v_example_group_id
        AND dm.deleted_at IS NULL;
        
        -- Link groups to template
        UPDATE modifier_groups
        SET course_template_id = v_new_template_id,
            is_custom = false
        WHERE id = ANY(v_pattern.group_ids);
        
        RAISE NOTICE '✓ Created template: %', v_pattern.group_name;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Find outliers (dishes missing common groups)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Outliers to review (dishes missing common groups):';
    RAISE NOTICE 'Check these manually - may need groups added';
END $$;

WITH patterns AS (
    SELECT * FROM new_restaurant_patterns
),
all_dishes AS (
    SELECT 
        d.id as dish_id,
        d.name as dish_name,
        d.course_id,
        c.name as category_name
    FROM dishes d
    INNER JOIN courses c ON c.id = d.course_id
    WHERE c.restaurant_id = @RESTAURANT_ID
    AND d.deleted_at IS NULL
),
dishes_with_groups AS (
    SELECT 
        ad.*,
        p.group_name,
        mg.id IS NOT NULL as has_group
    FROM all_dishes ad
    CROSS JOIN (SELECT DISTINCT course_id, group_name FROM patterns) p
    LEFT JOIN modifier_groups mg ON mg.dish_id = ad.dish_id 
        AND mg.name = p.group_name 
        AND mg.deleted_at IS NULL
    WHERE ad.course_id = p.course_id
)
SELECT 
    category_name as "Category",
    dish_name as "Dish Missing Group",
    group_name as "Should Have This Group"
FROM dishes_with_groups
WHERE has_group = false
ORDER BY category_name, group_name, dish_name;

-- Cleanup
DROP TABLE IF EXISTS new_restaurant_patterns;

RAISE NOTICE '';
RAISE NOTICE '✅ Migration complete for restaurant %', @RESTAURANT_ID;
RAISE NOTICE 'Review outliers above and add missing groups if needed';

