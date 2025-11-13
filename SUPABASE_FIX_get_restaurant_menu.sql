-- ============================================================================
-- FIX: get_restaurant_menu SQL Function
-- ============================================================================
-- **Purpose**: Fix broken get_restaurant_menu function to work with refactored schema
-- **Issue**: Function references deprecated tables and is missing language parameter
-- **Run This In**: Supabase Dashboard → SQL Editor
-- **Test Restaurant**: 961 (Chicco Shawarma Cantley) - should return 28 dishes
-- ============================================================================

CREATE OR REPLACE FUNCTION menuca_v3.get_restaurant_menu(
  p_restaurant_id bigint,
  p_language_code text DEFAULT 'en'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result jsonb;
  v_restaurant_status text;
BEGIN
  -- ========================================================================
  -- STEP 1: Validate restaurant exists and is active
  -- ========================================================================
  SELECT status INTO v_restaurant_status
  FROM menuca_v3.restaurants
  WHERE id = p_restaurant_id
    AND deleted_at IS NULL;
  
  IF v_restaurant_status IS NULL THEN
    RAISE EXCEPTION 'Restaurant not found or inactive';
  END IF;
  
  IF v_restaurant_status != 'active' THEN
    RAISE EXCEPTION 'Restaurant not found or inactive';
  END IF;
  
  -- ========================================================================
  -- STEP 2: Build menu structure using refactored tables
  -- ========================================================================
  WITH 
  -- Get active courses (categories) for this restaurant
  active_courses AS (
    SELECT
      c.id,
      c.restaurant_id,
      COALESCE(ct.name, c.name) as name,
      COALESCE(ct.description, c.description) as description,
      c.display_order,
      c.is_active,
      c.created_at,
      c.updated_at,
      c.deleted_at
    FROM menuca_v3.courses c
    LEFT JOIN menuca_v3.course_translations ct 
      ON ct.course_id = c.id 
      AND ct.language_code = p_language_code
    WHERE c.restaurant_id = p_restaurant_id
      AND c.is_active = true
      AND c.deleted_at IS NULL
    ORDER BY c.display_order ASC
  ),
  
  -- Get active dishes with inventory check
  active_dishes AS (
    SELECT
      d.id,
      d.restaurant_id,
      d.course_id,
      COALESCE(dt.name, d.name) as name,
      COALESCE(dt.description, d.description) as description,
      d.image_url,
      d.is_active,
      d.is_featured,
      d.has_customization,
      d.display_order,
      d.created_at,
      d.updated_at,
      d.deleted_at,
      -- Check inventory availability
      COALESCE(inv.is_available, true) as is_available,
      inv.unavailable_until,
      inv.reason as unavailable_reason
    FROM menuca_v3.dishes d
    LEFT JOIN menuca_v3.dish_translations dt
      ON dt.dish_id = d.id
      AND dt.language_code = p_language_code
    LEFT JOIN menuca_v3.dish_inventory inv
      ON inv.dish_id = d.id
    WHERE d.restaurant_id = p_restaurant_id
      AND d.is_active = true
      AND d.deleted_at IS NULL
    ORDER BY d.display_order ASC
  ),
  
  -- Get dish prices (refactored pricing system)
  dish_pricing AS (
    SELECT
      dp.dish_id,
      jsonb_agg(
        jsonb_build_object(
          'id', dp.id,
          'dish_id', dp.dish_id,
          'size_variant', dp.size_variant,
          'price', dp.price,
          'display_order', dp.display_order,
          'is_active', dp.is_active,
          'created_at', dp.created_at,
          'updated_at', dp.updated_at
        ) ORDER BY dp.display_order ASC
      ) as prices
    FROM menuca_v3.dish_prices dp
    WHERE dp.is_active = true
    GROUP BY dp.dish_id
  ),
  
  -- Get modifier groups with their modifiers (refactored modifier system)
  dish_modifiers AS (
    SELECT
      mg.dish_id,
      jsonb_agg(
        jsonb_build_object(
          'id', mg.id,
          'dish_id', mg.dish_id,
          'name', COALESCE(mgt.name, mg.name),
          'is_required', mg.is_required,
          'min_selections', mg.min_selections,
          'max_selections', mg.max_selections,
          'display_order', mg.display_order,
          'created_at', mg.created_at,
          'updated_at', mg.updated_at,
          'modifiers', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', dm.id,
                'modifier_group_id', dm.modifier_group_id,
                'name', COALESCE(dmt.name, dm.name),
                'price', dm.price,
                'is_included', dm.is_included,
                'is_default', dm.is_default,
                'display_order', dm.display_order,
                'created_at', dm.created_at,
                'updated_at', dm.updated_at
              ) ORDER BY dm.display_order ASC
            )
            FROM menuca_v3.dish_modifiers dm
            LEFT JOIN menuca_v3.dish_modifier_translations dmt
              ON dmt.dish_modifier_id = dm.id
              AND dmt.language_code = p_language_code
            WHERE dm.modifier_group_id = mg.id
              AND dm.deleted_at IS NULL
          )
        ) ORDER BY mg.display_order ASC
      ) as modifier_groups
    FROM menuca_v3.modifier_groups mg
    LEFT JOIN menuca_v3.modifier_group_translations mgt
      ON mgt.modifier_group_id = mg.id
      AND mgt.language_code = p_language_code
    WHERE mg.deleted_at IS NULL
    GROUP BY mg.dish_id
  ),
  
  -- Combine dishes with their prices and modifiers
  dishes_with_details AS (
    SELECT
      ad.course_id,
      jsonb_build_object(
        'id', ad.id,
        'restaurant_id', ad.restaurant_id,
        'course_id', ad.course_id,
        'name', ad.name,
        'description', ad.description,
        'image_url', ad.image_url,
        'is_active', ad.is_active,
        'is_featured', ad.is_featured,
        'has_customization', ad.has_customization,
        'display_order', ad.display_order,
        'created_at', ad.created_at,
        'updated_at', ad.updated_at,
        'deleted_at', ad.deleted_at,
        'is_available', ad.is_available,
        'unavailable_until', ad.unavailable_until,
        'unavailable_reason', ad.unavailable_reason,
        'prices', COALESCE(dp.prices, '[]'::jsonb),
        'modifiers', COALESCE(dm.modifier_groups, '[]'::jsonb)
      ) as dish_data
    FROM active_dishes ad
    LEFT JOIN dish_pricing dp ON dp.dish_id = ad.id
    LEFT JOIN dish_modifiers dm ON dm.dish_id = ad.id
  ),
  
  -- Group dishes by course
  courses_with_dishes AS (
    SELECT
      ac.id,
      jsonb_build_object(
        'id', ac.id,
        'restaurant_id', ac.restaurant_id,
        'name', ac.name,
        'description', ac.description,
        'display_order', ac.display_order,
        'is_active', ac.is_active,
        'created_at', ac.created_at,
        'updated_at', ac.updated_at,
        'deleted_at', ac.deleted_at,
        'dishes', COALESCE(
          (
            SELECT jsonb_agg(dwd.dish_data ORDER BY (dwd.dish_data->>'display_order')::int ASC)
            FROM dishes_with_details dwd
            WHERE dwd.course_id = ac.id
          ),
          '[]'::jsonb
        )
      ) as course_data
    FROM active_courses ac
  )
  
  -- Build final result
  SELECT jsonb_build_object(
    'restaurant_id', p_restaurant_id,
    'courses', COALESCE(
      (
        SELECT jsonb_agg(cwd.course_data ORDER BY (cwd.course_data->>'display_order')::int ASC)
        FROM courses_with_dishes cwd
      ),
      '[]'::jsonb
    )
  ) INTO v_result;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error fetching menu: %', SQLERRM;
END;
$$;

-- ============================================================================
-- Grant execute permission
-- ============================================================================
GRANT EXECUTE ON FUNCTION menuca_v3.get_restaurant_menu(bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION menuca_v3.get_restaurant_menu(bigint, text) TO anon;

-- ============================================================================
-- VERIFICATION TESTS
-- ============================================================================
-- Run these commands to verify the fix works:

-- Test 1: Function signature (should work with 2 parameters)
-- SELECT menuca_v3.get_restaurant_menu(961, 'en');

-- Test 2: Check restaurant 961 returns 28 dishes
-- SELECT 
--   jsonb_array_length((result->'courses')::jsonb) as course_count,
--   (
--     SELECT SUM(jsonb_array_length((course->'dishes')::jsonb))
--     FROM jsonb_array_elements((result->'courses')::jsonb) as course
--   ) as total_dishes
-- FROM (
--   SELECT menuca_v3.get_restaurant_menu(961, 'en') as result
-- ) subq;
-- Expected: total_dishes = 28

-- Test 3: Verify response structure (should have restaurant_id and courses)
-- SELECT jsonb_pretty(menuca_v3.get_restaurant_menu(961, 'en'));

-- Test 4: Check no deprecated table errors
-- If this runs without "column dm2.price does not exist" error, it's fixed!
-- SELECT menuca_v3.get_restaurant_menu(961, 'en');

-- ============================================================================
-- NOTES FOR FRONTEND INTEGRATION
-- ============================================================================
-- After running this SQL:
-- 1. The frontend page at app/(public)/r/[slug]/page.tsx will automatically work
-- 2. The API route at app/api/customer/restaurants/[slug]/menu/route.ts will work
-- 3. Test by visiting: http://localhost:5000/r/chicco-shawarma-cantley-961
-- 4. You should see all 28 dishes displayed
-- ============================================================================
