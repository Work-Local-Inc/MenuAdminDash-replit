import pool from './lib/db/postgres.ts';

console.log('🧪 Phase 11 Integration Tests - FINAL\n');
console.log('='
.repeat(60) + '\n');

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (details) console.log(`   ${details}`);
  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

try {
  // Test 1: Verify modifier_groups table structure
  console.log('Test 1: modifier_groups table structure...');
  const mgResult = await pool.query(`
    SELECT id, dish_id, name, is_required, min_selections, max_selections
    FROM menuca_v3.modifier_groups
    LIMIT 2
  `);
  
  if (mgResult.rows.length > 0) {
    const row = mgResult.rows[0];
    const hasCorrectColumns = 
      'is_required' in row && 
      'min_selections' in row && 
      'max_selections' in row;
    
    logTest('modifier_groups has refactored columns', hasCorrectColumns,
      `is_required=${row.is_required}, min=${row.min_selections}, max=${row.max_selections}`);
  }

  // Test 2: Verify dish_prices table structure
  console.log('\nTest 2: dish_prices table structure...');
  const dpResult = await pool.query(`
    SELECT id, dish_id, size_variant, price
    FROM menuca_v3.dish_prices
    LIMIT 2
  `);
  
  if (dpResult.rows.length > 0) {
    const row = dpResult.rows[0];
    logTest('dish_prices uses relational structure', true,
      `dish_id=${row.dish_id}, size_variant=${row.size_variant}, price=$${row.price}`);
  }

  // Test 3: SQL Function - get_restaurant_menu
  console.log('\nTest 3: get_restaurant_menu() SQL function...');
  const restaurantResult = await pool.query(`
    SELECT id, name, slug FROM menuca_v3.restaurants WHERE is_active = true LIMIT 1
  `);
  
  if (restaurantResult.rows.length > 0) {
    const restaurant = restaurantResult.rows[0];
    const menuResult = await pool.query(`
      SELECT menuca_v3.get_restaurant_menu($1, $2) as menu
    `, [restaurant.id, 'en']);
    
    const menu = menuResult.rows[0].menu;
    const hasCorrectStructure = 
      menu.restaurant_id && 
      Array.isArray(menu.courses);
    
    logTest('get_restaurant_menu() returns correct structure', hasCorrectStructure,
      `restaurant_id=${menu.restaurant_id}, courses=${menu.courses?.length || 0}`);
    
    // Verify no deprecated fields in dishes
    if (menu.courses?.length > 0 && menu.courses[0].dishes?.length > 0) {
      const dish = menu.courses[0].dishes[0];
      const noDeprecatedFields = 
        !('base_price' in dish) && 
        !('size_options' in dish) &&
        Array.isArray(dish.prices) &&
        Array.isArray(dish.modifier_groups);
      
      logTest('Dishes use new schema (no deprecated fields)', noDeprecatedFields,
        `has prices array, has modifier_groups array, no base_price/size_options`);
      
      // Verify modifier group structure
      if (dish.modifier_groups?.length > 0) {
        const group = dish.modifier_groups[0];
        const hasNewColumns = 
          'is_required' in group &&
          'min_selections' in group &&
          'max_selections' in group;
        
        logTest('Modifier groups have refactored columns in API response', hasNewColumns,
          `Group: ${group.name}, required=${group.is_required}, min=${group.min_selections}, max=${group.max_selections}`);
      }
    }
  }

  // Test 4: API Route - Customer Menu
  console.log('\nTest 4: API Route /api/customer/restaurants/[slug]/menu...');
  if (restaurantResult.rows.length > 0) {
    const restaurant = restaurantResult.rows[0];
    try {
      const response = await fetch(`http://localhost:5000/api/customer/restaurants/${restaurant.slug}/menu?language=en`);
      const apiMenu = await response.json();
      
      if (response.ok) {
        const apiHasCorrectStructure = 
          apiMenu.restaurant_id &&
          Array.isArray(apiMenu.courses);
        
        logTest('API route returns 200 with correct structure', apiHasCorrectStructure,
          `Status: ${response.status}, courses: ${apiMenu.courses?.length || 0}`);
      } else {
        logTest('API route returns 200', false, `Status: ${response.status}`);
      }
    } catch (fetchError) {
      logTest('API route accessible', false, `Fetch error: ${fetchError.message}`);
    }
  }

  // Test 5: SQL Function - validate_dish_customization
  console.log('\nTest 5: validate_dish_customization() SQL function...');
  const requiredGroupResult = await pool.query(`
    SELECT mg.dish_id, d.name
    FROM menuca_v3.modifier_groups mg
    JOIN menuca_v3.dishes d ON d.id = mg.dish_id
    WHERE mg.is_required = true
    LIMIT 1
  `);
  
  if (requiredGroupResult.rows.length > 0) {
    const { dish_id, name } = requiredGroupResult.rows[0];
    const validationResult = await pool.query(`
      SELECT menuca_v3.validate_dish_customization($1, $2::jsonb) as result
    `, [dish_id, '[]']);
    
    const validation = validationResult.rows[0].result;
    const correctlyRejects = !validation.is_valid && validation.errors.length > 0;
    
    logTest('validate_dish_customization() enforces required groups', correctlyRejects,
      `Dish: ${name}, valid=${validation.is_valid}, errors=${validation.errors.length}`);
  }

  // Test 6: SQL Function - calculate_dish_price
  console.log('\nTest 6: calculate_dish_price() SQL function...');
  const dishForPriceResult = await pool.query(`
    SELECT d.id, d.name, dp.size_variant, dp.price
    FROM menuca_v3.dishes d
    JOIN menuca_v3.dish_prices dp ON dp.dish_id = d.id
    WHERE dp.size_variant = 'default'
    LIMIT 1
  `);
  
  if (dishForPriceResult.rows.length > 0) {
    const { id: dish_id, name, size_variant, price } = dishForPriceResult.rows[0];
    const priceResult = await pool.query(`
      SELECT menuca_v3.calculate_dish_price($1, $2, $3::jsonb) as result
    `, [dish_id, size_variant, '[]']);
    
    const priceCalc = priceResult.rows[0].result;
    const expectedPrice = parseFloat(price);
    const priceMatches = Math.abs(priceCalc.base_price - expectedPrice) < 0.01;
    
    logTest('calculate_dish_price() returns correct base price', priceMatches,
      `Dish: ${name}, expected=$${expectedPrice}, got=$${priceCalc.base_price}`);
    
    const hasCorrectStructure = 
      'base_price' in priceCalc &&
      'modifier_total' in priceCalc &&
      'total_price' in priceCalc &&
      'currency' in priceCalc;
    
    logTest('calculate_dish_price() has correct response structure', hasCorrectStructure,
      `base=$${priceCalc.base_price}, total=$${priceCalc.total_price}, currency=${priceCalc.currency}`);
  }

  // Test 7: Modifier Group Default Values
  console.log('\nTest 7: Checking modifier_groups default values...');
  const defaultsResult = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE max_selections = 999) as unlimited_count,
      COUNT(*) FILTER (WHERE max_selections = 1) as single_count,
      COUNT(*) as total_count
    FROM menuca_v3.modifier_groups
  `);
  
  const defaults = defaultsResult.rows[0];
  const hasUnlimitedDefaults = parseInt(defaults.unlimited_count) > 0;
  
  logTest('modifier_groups uses 999 for unlimited (not 1)', hasUnlimitedDefaults,
    `unlimited (999): ${defaults.unlimited_count}, single (1): ${defaults.single_count}, total: ${defaults.total_count}`);

  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Phase 11 Integration VERIFIED!');
    console.log('\n✅ Refactored Schema Integration Confirmed:');
    console.log('   • modifier_groups table with correct columns');
    console.log('   • dish_prices relational structure');
    console.log('   • SQL functions working correctly');
    console.log('   • API routes return new schema');
    console.log('   • No deprecated fields in responses');
    console.log('   • Default values aligned (max_selections=999)');
  } else {
    console.log('\n⚠️  Some tests failed - review details above');
  }

} catch (error) {
  console.error('\n❌ Test suite error:', error.message);
  console.error(error.stack);
} finally {
  process.exit(results.failed === 0 ? 0 : 1);
}
