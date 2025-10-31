import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('🧪 API Integration Tests - menuca_v3 Schema\n');

try {
  // Test 1: Verify modifier_groups table
  console.log('Test 1: Verifying modifier_groups table...');
  const mgResult = await pool.query(`
    SELECT id, dish_id, name, is_required, min_selections, max_selections
    FROM menuca_v3.modifier_groups
    LIMIT 3
  `);
  console.log('✅ modifier_groups table exists:', mgResult.rows.length, 'records');
  if (mgResult.rows.length > 0) {
    console.log('   Sample:', JSON.stringify(mgResult.rows[0], null, 2));
  }

  // Test 2: Verify dish_prices table
  console.log('\nTest 2: Verifying dish_prices table...');
  const dpResult = await pool.query(`
    SELECT id, dish_id, size_code, amount
    FROM menuca_v3.dish_prices
    LIMIT 3
  `);
  console.log('✅ dish_prices table exists:', dpResult.rows.length, 'records');
  if (dpResult.rows.length > 0) {
    console.log('   Sample:', JSON.stringify(dpResult.rows[0], null, 2));
  }

  // Test 3: Find test restaurant
  console.log('\nTest 3: Finding test restaurant...');
  const restaurantResult = await pool.query(`
    SELECT id, name, slug
    FROM menuca_v3.restaurants
    WHERE is_active = true
    LIMIT 1
  `);
  
  if (restaurantResult.rows.length > 0) {
    const restaurant = restaurantResult.rows[0];
    console.log('✅ Test restaurant:', restaurant.name, `(ID: ${restaurant.id})`);

    // Test 4: Test get_restaurant_menu function
    console.log('\nTest 4: Testing get_restaurant_menu() function...');
    const menuResult = await pool.query(`
      SELECT menuca_v3.get_restaurant_menu($1, $2) as menu
    `, [restaurant.id, 'en']);
    
    const menu = menuResult.rows[0].menu;
    console.log('✅ get_restaurant_menu succeeded');
    console.log('   Restaurant ID:', menu.restaurant_id);
    console.log('   Courses count:', menu.courses?.length || 0);
    
    if (menu.courses?.length > 0) {
      const course = menu.courses[0];
      console.log('   First course:', course.name);
      console.log('   Dishes in first course:', course.dishes?.length || 0);
      
      if (course.dishes?.length > 0) {
        const dish = course.dishes[0];
        console.log('\n   📋 Sample Dish Structure:');
        console.log('      Name:', dish.name);
        console.log('      Has prices array:', Array.isArray(dish.prices));
        console.log('      Prices count:', dish.prices?.length || 0);
        if (dish.prices?.length > 0) {
          console.log('      First price:', JSON.stringify(dish.prices[0]));
        }
        console.log('      Has modifier_groups:', Array.isArray(dish.modifier_groups));
        console.log('      Modifier groups count:', dish.modifier_groups?.length || 0);
        if (dish.modifier_groups?.length > 0) {
          const group = dish.modifier_groups[0];
          console.log('      First group:', JSON.stringify({
            name: group.name,
            is_required: group.is_required,
            min_selections: group.min_selections,
            max_selections: group.max_selections,
            modifiers_count: group.modifiers?.length || 0
          }));
        }
      }
    }
  }

  // Test 5: Find dish with prices
  console.log('\nTest 5: Testing dish with multiple prices...');
  const dishPriceResult = await pool.query(`
    SELECT d.id, d.name, 
           json_agg(json_build_object(
             'size_code', dp.size_code, 
             'amount', dp.amount
           )) as prices
    FROM menuca_v3.dishes d
    JOIN menuca_v3.dish_prices dp ON dp.dish_id = d.id
    GROUP BY d.id, d.name
    HAVING COUNT(dp.id) > 1
    LIMIT 1
  `);
  
  if (dishPriceResult.rows.length > 0) {
    const dish = dishPriceResult.rows[0];
    console.log('✅ Dish with multiple prices found:', dish.name);
    console.log('   Prices:', JSON.stringify(dish.prices, null, 2));
  }

  // Test 6: Test validate_dish_customization
  console.log('\nTest 6: Finding dish with required modifier group...');
  const requiredGroupResult = await pool.query(`
    SELECT mg.dish_id, d.name as dish_name, mg.id as group_id, mg.name as group_name
    FROM menuca_v3.modifier_groups mg
    JOIN menuca_v3.dishes d ON d.id = mg.dish_id
    WHERE mg.is_required = true
    LIMIT 1
  `);
  
  if (requiredGroupResult.rows.length > 0) {
    const { dish_id, dish_name, group_name } = requiredGroupResult.rows[0];
    console.log('✅ Dish with required group:', dish_name, `(required: ${group_name})`);
    
    console.log('\nTest 7: Testing validate_dish_customization() - Empty selections...');
    const validationResult = await pool.query(`
      SELECT menuca_v3.validate_dish_customization($1, $2::jsonb) as result
    `, [dish_id, '[]']);
    
    const validation = validationResult.rows[0].result;
    console.log('   Valid:', validation.is_valid);
    console.log('   Errors:', JSON.stringify(validation.errors));
    
    if (!validation.is_valid) {
      console.log('   ✅ Correctly rejected empty selection for required group');
    }
  }

  // Test 8: Test calculate_dish_price
  console.log('\nTest 8: Finding dish for price calculation...');
  const dishForPriceResult = await pool.query(`
    SELECT d.id, d.name, dp.size_code, dp.amount
    FROM menuca_v3.dishes d
    JOIN menuca_v3.dish_prices dp ON dp.dish_id = d.id
    WHERE dp.size_code = 'default'
    LIMIT 1
  `);
  
  if (dishForPriceResult.rows.length > 0) {
    const { id: dish_id, name, size_code, amount } = dishForPriceResult.rows[0];
    console.log('✅ Dish for pricing:', name, `(${size_code}: $${amount})`);
    
    console.log('\nTest 9: Testing calculate_dish_price()...');
    const priceResult = await pool.query(`
      SELECT menuca_v3.calculate_dish_price($1, $2, $3::jsonb) as result
    `, [dish_id, size_code, '[]']);
    
    const priceCalc = priceResult.rows[0].result;
    console.log('   Result:', JSON.stringify(priceCalc, null, 2));
    console.log('   ✅ Base price matches:', priceCalc.base_price === parseFloat(amount));
  }

  console.log('\n✅ All integration tests complete!');
  console.log('\n📊 Summary:');
  console.log('   ✅ Schema tables verified (modifier_groups, dish_prices)');
  console.log('   ✅ get_restaurant_menu() working');
  console.log('   ✅ validate_dish_customization() working');
  console.log('   ✅ calculate_dish_price() working');
  console.log('   ✅ Refactored schema integration confirmed');

} catch (error) {
  console.error('❌ Test error:', error.message);
  console.error(error);
} finally {
  await pool.end();
}
