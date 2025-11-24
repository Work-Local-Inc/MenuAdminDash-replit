-- ============================================================================
-- DRY RUN: Preview Category Template Migration
-- ============================================================================
-- Run this FIRST to see what templates will be created
-- NO changes made - safe to run
-- ============================================================================

SET search_path TO menuca_v3;

WITH category_totals AS (
    SELECT 
        c.id as course_id,
        c.name as category_name,
        c.restaurant_id,
        r.name as restaurant_name,
        COUNT(DISTINCT d.id) as total_dishes
    FROM courses c
    INNER JOIN restaurants r ON r.id = c.restaurant_id
    INNER JOIN dishes d ON d.course_id = c.id
    WHERE d.deleted_at IS NULL
    GROUP BY c.id, c.name, c.restaurant_id, r.name
),
group_patterns AS (
    SELECT 
        d.course_id,
        mg.name as group_name,
        mg.is_required,
        mg.min_selections,
        mg.max_selections,
        COUNT(DISTINCT mg.dish_id) as dishes_with_this_group,
        ARRAY_AGG(DISTINCT d.name ORDER BY d.name) FILTER (WHERE d.name IS NOT NULL) as example_dishes
    FROM dishes d
    INNER JOIN modifier_groups mg ON mg.dish_id = d.id
    WHERE d.deleted_at IS NULL
    AND mg.deleted_at IS NULL
    AND mg.course_template_id IS NULL  -- Not already templated
    GROUP BY d.course_id, mg.name, mg.is_required, mg.min_selections, mg.max_selections
)
SELECT 
    ct.restaurant_name as "Restaurant",
    ct.category_name as "Category",
    gp.group_name as "Template Name",
    gp.is_required as "Required?",
    gp.min_selections || '-' || gp.max_selections as "Selections",
    gp.dishes_with_this_group as "Dishes",
    ct.total_dishes as "Total",
    ROUND(100.0 * gp.dishes_with_this_group / ct.total_dishes, 0) || '%' as "Match",
    (gp.example_dishes)[1:3] as "Example Dishes"
FROM group_patterns gp
INNER JOIN category_totals ct ON ct.course_id = gp.course_id
WHERE gp.dishes_with_this_group >= 3 
AND gp.dishes_with_this_group::float / ct.total_dishes >= 0.5
ORDER BY 
    ct.restaurant_id,
    ct.course_id,
    (gp.dishes_with_this_group::float / ct.total_dishes) DESC;

-- Summary
SELECT 
    COUNT(*) as "Templates to Create",
    SUM(dishes_with_this_group) as "Groups to Link",
    COUNT(DISTINCT course_id) as "Categories Affected"
FROM (
    SELECT 
        d.course_id,
        mg.name,
        COUNT(DISTINCT mg.dish_id) as dishes_with_this_group,
        (SELECT COUNT(DISTINCT id) FROM dishes WHERE course_id = d.course_id AND deleted_at IS NULL) as total
    FROM dishes d
    INNER JOIN modifier_groups mg ON mg.dish_id = d.id
    WHERE d.deleted_at IS NULL
    AND mg.deleted_at IS NULL
    AND mg.course_template_id IS NULL
    GROUP BY d.course_id, mg.name
    HAVING COUNT(DISTINCT mg.dish_id) >= 3 
    AND COUNT(DISTINCT mg.dish_id)::float / (SELECT COUNT(DISTINCT id) FROM dishes WHERE course_id = d.course_id AND deleted_at IS NULL) >= 0.5
) patterns;

