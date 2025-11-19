import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.SUPABASE_BRANCH_DB_URL;

if (!connectionString) {
  console.error('❌ Missing SUPABASE_BRANCH_DB_URL');
  process.exit(1);
}

const client = new Client({ connectionString });

console.log('🔧 Connecting to Supabase PostgreSQL...\n');

try {
  await client.connect();
  console.log('✅ Connected!\n');

  console.log('📝 Creating/replacing get_restaurant_menu function...\n');

  const functionSQL = `
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
  SELECT status INTO v_restaurant_status
  FROM menuca_v3.restaurants
  WHERE id = p_restaurant_id AND deleted_at IS NULL;
  
  IF v_restaurant_status IS NULL THEN
    RAISE EXCEPTION 'Restaurant not found or inactive';
  END IF;
  
  IF v_restaurant_status != 'active' THEN
    RAISE EXCEPTION 'Restaurant not found or inactive';
  END IF;
  
  WITH 
  active_courses AS (
    SELECT
      c.id, c.restaurant_id,
      COALESCE(ct.name, c.name) as name,
      COALESCE(ct.description, c.description) as description,
      c.display_order, c.is_active, c.created_at, c.updated_at, c.deleted_at
    FROM menuca_v3.courses c
    LEFT JOIN menuca_v3.course_translations ct 
      ON ct.course_id = c.id AND ct.language_code = p_language_code
    WHERE c.restaurant_id = p_restaurant_id
      AND c.is_active = true AND c.deleted_at IS NULL
    ORDER BY c.display_order ASC
  ),
  active_dishes AS (
    SELECT
      d.id, d.restaurant_id, d.course_id,
      COALESCE(dt.name, d.name) as name,
      COALESCE(dt.description, d.description) as description,
      d.image_url, d.is_active, d.has_customization,
      d.display_order, d.created_at, d.updated_at, d.deleted_at,
      COALESCE(inv.is_available, true) as is_available,
      inv.unavailable_until, inv.reason as unavailable_reason
    FROM menuca_v3.dishes d
    LEFT JOIN menuca_v3.dish_translations dt
      ON dt.dish_id = d.id AND dt.language_code = p_language_code
    LEFT JOIN menuca_v3.dish_inventory inv ON inv.dish_id = d.id
    WHERE d.restaurant_id = p_restaurant_id
      AND d.is_active = true AND d.deleted_at IS NULL
    ORDER BY d.display_order ASC
  ),
  dish_pricing AS (
    SELECT
      dp.dish_id,
      jsonb_agg(
        jsonb_build_object(
          'id', dp.id, 'dish_id', dp.dish_id, 'size_variant', dp.size_variant,
          'price', dp.price, 'display_order', dp.display_order, 'is_active', dp.is_active,
          'created_at', dp.created_at, 'updated_at', dp.updated_at
        ) ORDER BY dp.display_order ASC
      ) as prices
    FROM menuca_v3.dish_prices dp
    WHERE dp.is_active = true
    GROUP BY dp.dish_id
  ),
  dish_modifiers AS (
    SELECT
      mg.dish_id,
      jsonb_agg(
        jsonb_build_object(
          'id', mg.id, 'dish_id', mg.dish_id,
          'name', COALESCE(mgt.name, mg.name),
          'is_required', mg.is_required, 'min_selections', mg.min_selections,
          'max_selections', mg.max_selections, 'display_order', mg.display_order,
          'created_at', mg.created_at, 'updated_at', mg.updated_at,
          'modifiers', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', dm.id, 'modifier_group_id', dm.modifier_group_id,
                'name', COALESCE(dmt.name, dm.name),
                'price', COALESCE(dmp.price, 0),
                'is_default', dm.is_default,
                'display_order', dm.display_order, 
                'created_at', dm.created_at,
                'updated_at', dm.updated_at
              ) ORDER BY dm.display_order ASC
            )
            FROM menuca_v3.dish_modifiers dm
            LEFT JOIN menuca_v3.dish_modifier_translations dmt
              ON dmt.dish_modifier_id = dm.id AND dmt.language_code = p_language_code
            LEFT JOIN menuca_v3.dish_modifier_prices dmp
              ON dmp.dish_modifier_id = dm.id AND dmp.is_active = true
            WHERE dm.modifier_group_id = mg.id AND dm.deleted_at IS NULL
          )
        ) ORDER BY mg.display_order ASC
      ) as modifier_groups
    FROM menuca_v3.modifier_groups mg
    LEFT JOIN menuca_v3.modifier_group_translations mgt
      ON mgt.modifier_group_id = mg.id AND mgt.language_code = p_language_code
    GROUP BY mg.dish_id
  ),
  dishes_with_details AS (
    SELECT
      ad.course_id,
      jsonb_build_object(
        'id', ad.id, 'restaurant_id', ad.restaurant_id, 'course_id', ad.course_id,
        'name', ad.name, 'description', ad.description, 'image_url', ad.image_url,
        'is_active', ad.is_active,
        'has_customization', ad.has_customization, 'display_order', ad.display_order,
        'created_at', ad.created_at, 'updated_at', ad.updated_at, 'deleted_at', ad.deleted_at,
        'is_available', ad.is_available, 'unavailable_until', ad.unavailable_until,
        'unavailable_reason', ad.unavailable_reason,
        'prices', COALESCE(dp.prices, '[]'::jsonb),
        'modifiers', COALESCE(dm.modifier_groups, '[]'::jsonb)
      ) as dish_data
    FROM active_dishes ad
    LEFT JOIN dish_pricing dp ON dp.dish_id = ad.id
    LEFT JOIN dish_modifiers dm ON dm.dish_id = ad.id
  ),
  courses_with_dishes AS (
    SELECT
      ac.id,
      jsonb_build_object(
        'id', ac.id, 'restaurant_id', ac.restaurant_id, 'name', ac.name,
        'description', ac.description, 'display_order', ac.display_order,
        'is_active', ac.is_active, 'created_at', ac.created_at,
        'updated_at', ac.updated_at, 'deleted_at', ac.deleted_at,
        'dishes', COALESCE(
          (
            SELECT jsonb_agg(dwd.dish_data ORDER BY (dwd.dish_data->>'display_order')::int ASC)
            FROM dishes_with_details dwd WHERE dwd.course_id = ac.id
          ),
          '[]'::jsonb
        )
      ) as course_data
    FROM active_courses ac
  )
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
`;

  await client.query(functionSQL);
  console.log('✅ Function created successfully!\n');

  // Grant permissions
  await client.query('GRANT EXECUTE ON FUNCTION menuca_v3.get_restaurant_menu(bigint, text) TO authenticated');
  await client.query('GRANT EXECUTE ON FUNCTION menuca_v3.get_restaurant_menu(bigint, text) TO anon');
  console.log('✅ Permissions granted!\n');

  // Test the function
  console.log('🧪 Testing with restaurant 961...\n');
  const testResult = await client.query("SELECT menuca_v3.get_restaurant_menu(961, 'en') as menu");
  const menuData = testResult.rows[0].menu;

  const courseCount = menuData?.courses?.length || 0;
  const totalDishes = menuData?.courses?.reduce((sum, c) => sum + (c.dishes?.length || 0), 0) || 0;

  console.log('✅ Test Results:');
  console.log(`   Restaurant ID: ${menuData?.restaurant_id}`);
  console.log(`   Courses: ${courseCount}`);
  console.log(`   Total Dishes: ${totalDishes}`);

  if (totalDishes === 28) {
    console.log('\n🎉 SUCCESS! All 28 dishes found for restaurant 961!');
  } else {
    console.log(`\n⚠️  Expected 28 dishes, got ${totalDishes}`);
  }

  console.log('\n✅ Fix complete! The frontend should now work.');
  console.log('   Visit: http://localhost:5000/r/chicco-shawarma-cantley-961\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Details:', error);
  process.exit(1);
} finally {
  await client.end();
}
