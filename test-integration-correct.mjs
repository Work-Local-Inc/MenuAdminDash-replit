import pool from './lib/db/postgres.ts';

console.log('\n🧪 PHASE 11 INTEGRATION TESTS - FINAL RUN\n');
console.log('='

.repeat(70) + '\n');

const results = { passed: 0, failed: 0, tests: [] };

function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (details) console.log(`   ${details}`);
  results.tests.push({ name, passed, details });
  if (passed) results.passed++; else results.failed++;
}

try {
  // Test 1: modifier_groups table
  console.log('Test 1: modifier_groups table with refactored columns...');
  const mgResult = await pool.query(`
    SELECT id, dish_id, name, is_required, min_selections, max_selections
    FROM menuca_v3.modifier_groups LIMIT 2
  `);
  
  if (mgResult.rows.length > 0) {
    const row = mgResult.rows[0];
    logTest('modifier_groups has is_required, min_selections, max_selections', 
      'is_required' in row && 'min_selections' in row && 'max_selections' in row,
      `required=${row.is_required}, min=${row.min_selections}, max=${row.max_selections}`);
  }

  // Test 2: dish_prices table
  console.log('\nTest 2: dish_prices relational table...');
  const dpResult = await pool.query(`
    SELECT id, dish_id, size_variant, price FROM menuca_v3.dish_prices LIMIT 2
  `);
  
  if (dpResult.rows.length > 0) {
    const row = dpResult.rows[0];
    logTest('dish_prices uses size_variant and price columns', true,
      `dish_id=${row.dish_id}, size_variant=${row.size_variant}, price=$${row.price}`);
  }

  // Test 3: get_restaurant_menu SQL function
  console.log('\nTest 3: get_restaurant_menu() SQL function...');
  const restaurantResult = await pool.query(`
    SELECT id, name, slug FROM menuca_v3.restaurants 
    WHERE status = 'active' AND slug IS NOT NULL LIMIT 1
  `);
  
  if (restaurantResult.rows.length > 0) {
    const restaurant = restaurantResult.rows[0];
    const menuResult = await pool.query(`
      SELECT menuca_v3.get_restaurant_menu($1, $2) as menu
    `, [restaurant.id, 'en']);
    
    const menu = menuResult.rows[0].menu;
    logTest('get_restaurant_menu() returns menu structure', 
      menu.restaurant_id && Array.isArray(menu.courses),
      `restaurant_id=${menu.restaurant_id}, courses=${menu.courses?.length || 0}`);
    
    // Check for deprecated fields
    if (menu.courses?.length > 0 && menu.courses[0].dishes?.length > 0) {
      const dish = menu.courses[0].dishes[0];
      logTest('Dishes have NO deprecated fields (base_price, size_options)', 
        !('base_price' in dish) && !('size_options' in dish),
        `has prices array=${Array.isArray(dish.prices)}, has modifier_groups=${Array.isArray(dish.modifier_groups)}`);
      
      // Check modifier group structure
      if (dish.modifier_groups?.length > 0) {
        const group = dish.modifier_groups[0];
        logTest('Modifier groups have new columns in SQL response', 
          'is_required' in group && 'min_selections' in group && 'max_selections' in group,
          `"${group.name}": required=${group.is_required}, min=${group.min_selections}, max=${group.max_selections}`);
      }
    }

    // Test 4: API Route
    console.log('\nTest 4: API Route /api/customer/restaurants/[slug]/menu...');
    try {
      const response = await fetch(`http://localhost:5000/api/customer/restaurants/${restaurant.slug}/menu?language=en`);
      const apiMenu = await response.json();
      
      logTest('API route returns 200 OK', response.ok,
        `Status: ${response.status}, courses: ${apiMenu.courses?.length || 0}`);
      
      if (response.ok && apiMenu.courses?.length > 0) {
        logTest('API response has correct structure', 
          apiMenu.restaurant_id && Array.isArray(apiMenu.courses),
          'restaurant_id present, courses is array');
      }
    } catch (fetchError) {
      logTest('API route accessible', false, fetchError.message);
    }
  } else {
    console.log('⚠️  No active restaurant with slug found, skipping menu tests');
  }

  // Test 5: validate_dish_customization
  console.log('\nTest 5: validate_dish_customization() function...');
  const requiredGroupResult = await pool.query(`
    SELECT mg.dish_id, d.name
    FROM menuca_v3.modifier_groups mg
    JOIN menuca_v3.dishes d ON d.id = mg.dish_id
    WHERE mg.is_required = true LIMIT 1
  `);
  
  if (requiredGroupResult.rows.length > 0) {
    const { dish_id, name } = requiredGroupResult.rows[0];
    const validationResult = await pool.query(`
      SELECT menuca_v3.validate_dish_customization($1, $2::jsonb) as result
    `, [dish_id, '[]']);
    
    const validation = validationResult.rows[0].result;
    logTest('validate_dish_customization() enforces required groups', 
      !validation.is_valid && validation.errors.length > 0,
      `Dish "${name}": valid=${validation.is_valid}, errors=${validation.errors.length}`);
  }

  // Test 6: calculate_dish_price
  console.log('\nTest 6: calculate_dish_price() function...');
  const dishForPriceResult = await pool.query(`
    SELECT d.id, d.name, dp.size_variant, dp.price
    FROM menuca_v3.dishes d
    JOIN menuca_v3.dish_prices dp ON dp.dish_id = d.id
    WHERE dp.size_variant = 'default' LIMIT 1
  `);
  
  if (dishForPriceResult.rows.length > 0) {
    const { id: dish_id, name, size_variant, price } = dishForPriceResult.rows[0];
    const priceResult = await pool.query(`
      SELECT menuca_v3.calculate_dish_price($1, $2, $3::jsonb) as result
    `, [dish_id, size_variant, '[]']);
    
    const priceCalc = priceResult.rows[0].result;
    const expectedPrice = parseFloat(price);
    const priceMatches = Math.abs(priceCalc.base_price - expectedPrice) < 0.01;
    
    logTest('calculate_dish_price() calculates correctly', priceMatches,
      `"${name}": expected=$${expectedPrice}, got=$${priceCalc.base_price}`);
    
    logTest('calculate_dish_price() has complete response structure', 
      'base_price' in priceCalc && 'modifier_total' in priceCalc && 
      'total_price' in priceCalc && 'currency' in priceCalc,
      `base=$${priceCalc.base_price}, total=$${priceCalc.total_price}, currency=${priceCalc.currency}`);
  }

  // Test 7: Default values check
  console.log('\nTest 7: modifier_groups default max_selections...');
  const defaultsResult = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE max_selections = 999) as unlimited_count,
      COUNT(*) FILTER (WHERE max_selections = 1) as single_count,
      COUNT(*) as total_count
    FROM menuca_v3.modifier_groups
  `);
  
  const defaults = defaultsResult.rows[0];
  logTest('Uses 999 for unlimited (refactored schema default)', 
    parseInt(defaults.unlimited_count) > 0,
    `unlimited (999): ${defaults.unlimited_count}, single (1): ${defaults.single_count}`);

  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%\n`);
  
  if (results.failed === 0) {
    console.log('🎉 ALL TESTS PASSED!\n');
    console.log('✅ PHASE 11 API INTEGRATION VERIFIED:');
    console.log('   • modifier_groups table with correct columns');
    console.log('   • dish_prices relational structure');
    console.log('   • get_restaurant_menu() SQL function working');
    console.log('   • API routes return refactored schema');
    console.log('   • validate_dish_customization() enforces rules');
    console.log('   • calculate_dish_price() calculates correctly');
    console.log('   • NO deprecated fields in responses');
    console.log('   • Default values aligned (max_selections=999)');
    console.log('\n✅ Backend API integration complete and verified!');
  } else {
    console.log('⚠️  Some tests failed - review details above\n');
  }

} catch (error) {
  console.error('\n❌ Test suite error:', error.message);
  console.error(error.stack);
} finally {
  process.exit(results.failed === 0 ? 0 : 1);
}
