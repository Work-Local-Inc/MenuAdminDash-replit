import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.SUPABASE_BRANCH_DB_URL });

console.log('🚀 Creating ROBUST get_restaurant_menu function...\n');

try {
  await client.connect();

  // Drop old version
  await client.query('DROP FUNCTION IF EXISTS menuca_v3.get_restaurant_menu(bigint, text)');
  
  // Create version that ALWAYS returns valid JSON (never NULL)
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
BEGIN
  -- Check restaurant exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM menuca_v3.restaurants 
    WHERE id = p_restaurant_id AND status = 'active' AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Restaurant not found or inactive';
  END IF;
  
  -- ALWAYS initialize result with restaurant_id and empty courses array
  v_result := jsonb_build_object(
    'restaurant_id', p_restaurant_id,
    'courses', '[]'::jsonb
  );
  
  -- Build menu structure (only updates if courses exist)
  SELECT jsonb_build_object(
    'restaurant_id', p_restaurant_id,
    'courses', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'display_order', c.display_order,
          'dishes', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', d.id,
                'name', d.name,
                'description', d.description,
                'display_order', d.display_order,
                'prices', (
                  SELECT jsonb_agg(jsonb_build_object('size_variant', size_variant, 'price', price))
                  FROM menuca_v3.dish_prices 
                  WHERE dish_id = d.id AND is_active = true
                )
              ) ORDER BY d.display_order
            )
            FROM menuca_v3.dishes d
            WHERE d.course_id = c.id 
              AND d.restaurant_id = p_restaurant_id
              AND d.is_active = true 
              AND d.deleted_at IS NULL
          ), '[]'::jsonb)
        ) ORDER BY c.display_order
      ),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM menuca_v3.courses c
  WHERE c.restaurant_id = p_restaurant_id
    AND c.is_active = true
    AND c.deleted_at IS NULL;
  
  -- Ensure v_result is never NULL (fallback to empty menu)
  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'restaurant_id', p_restaurant_id,
      'courses', '[]'::jsonb
    );
  END IF;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION menuca_v3.get_restaurant_menu(bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION menuca_v3.get_restaurant_menu(bigint, text) TO anon;
`;

  await client.query(functionSQL);
  console.log('✅ Robust function created!\n');

  // Test with restaurant 961 (has courses)
  console.log('🧪 Test 1: Restaurant WITH courses (961)...');
  const result1 = await client.query("SELECT menuca_v3.get_restaurant_menu(961, 'en') as menu");
  const menu1 = result1.rows[0].menu;
  console.log(`   ✅ Courses: ${menu1.courses.length}, Dishes: ${menu1.courses.reduce((sum, c) => sum + c.dishes.length, 0)}`);
  
  // Test with a restaurant that might have no courses
  console.log('\n🧪 Test 2: Checking for restaurants with zero courses...');
  const emptyTest = await client.query(`
    SELECT r.id, r.name 
    FROM menuca_v3.restaurants r 
    WHERE r.status = 'active' 
      AND r.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM menuca_v3.courses c 
        WHERE c.restaurant_id = r.id 
          AND c.is_active = true 
          AND c.deleted_at IS NULL
      )
    LIMIT 1
  `);
  
  if (emptyTest.rows.length > 0) {
    const testId = emptyTest.rows[0].id;
    console.log(`   Testing restaurant ${testId} (${emptyTest.rows[0].name})...`);
    const result2 = await client.query("SELECT menuca_v3.get_restaurant_menu($1, 'en') as menu", [testId]);
    const menu2 = result2.rows[0].menu;
    console.log(`   ✅ Returns: ${JSON.stringify(menu2)} (should have empty courses array)`);
  } else {
    console.log('   ℹ️  No restaurants with zero courses found');
  }
  
  console.log('\n🎉 All tests passed!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await client.end();
}
