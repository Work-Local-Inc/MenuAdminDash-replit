import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Starting API Integration Tests\n');

// Test 1: Verify refactored schema tables exist
console.log('Test 1: Verifying refactored schema tables...');
const { data: modifierGroups, error: mg_error } = await supabase
  .from('modifier_groups')
  .select('*')
  .limit(5);

if (mg_error) {
  console.error('❌ modifier_groups table error:', mg_error);
} else {
  console.log('✅ modifier_groups table exists:', modifierGroups.length, 'records');
  if (modifierGroups.length > 0) {
    console.log('   Sample:', JSON.stringify(modifierGroups[0], null, 2));
  }
}

// Test 2: Verify dish_prices table
console.log('\nTest 2: Verifying dish_prices table...');
const { data: dishPrices, error: dp_error } = await supabase
  .from('dish_prices')
  .select('*')
  .limit(5);

if (dp_error) {
  console.error('❌ dish_prices table error:', dp_error);
} else {
  console.log('✅ dish_prices table exists:', dishPrices.length, 'records');
  if (dishPrices.length > 0) {
    console.log('   Sample:', JSON.stringify(dishPrices[0], null, 2));
  }
}

// Test 3: Find a test restaurant for menu testing
console.log('\nTest 3: Finding test restaurant...');
const { data: restaurants, error: r_error } = await supabase
  .from('restaurants')
  .select('id, name, slug, is_active')
  .eq('is_active', true)
  .limit(1);

if (r_error) {
  console.error('❌ restaurants query error:', r_error);
} else if (restaurants.length > 0) {
  const restaurant = restaurants[0];
  console.log('✅ Test restaurant found:', restaurant.name, `(slug: ${restaurant.slug})`);
  
  // Test 4: Test get_restaurant_menu SQL function
  console.log('\nTest 4: Testing get_restaurant_menu() function...');
  const { data: menuData, error: menu_error } = await supabase
    .rpc('get_restaurant_menu', {
      p_restaurant_id: restaurant.id,
      p_language: 'en'
    });
  
  if (menu_error) {
    console.error('❌ get_restaurant_menu error:', menu_error);
  } else {
    console.log('✅ get_restaurant_menu succeeded');
    console.log('   Restaurant ID:', menuData?.restaurant_id || 'N/A');
    console.log('   Courses:', Array.isArray(menuData?.courses) ? menuData.courses.length : 0);
    
    if (menuData?.courses?.length > 0 && menuData.courses[0].dishes?.length > 0) {
      const dish = menuData.courses[0].dishes[0];
      console.log('   Sample dish:', dish.name);
      console.log('   Has prices array:', Array.isArray(dish.prices));
      console.log('   Has modifier_groups:', Array.isArray(dish.modifier_groups));
    }
  }
} else {
  console.log('⚠️  No active restaurants found');
}

// Test 5: Find dish with modifier groups for validation testing
console.log('\nTest 5: Finding dish with modifier groups...');
const { data: dishWithGroups, error: dwg_error } = await supabase
  .from('modifier_groups')
  .select('dish_id, dishes(name)')
  .limit(1);

if (dwg_error) {
  console.error('❌ Error finding dish with groups:', dwg_error);
} else if (dishWithGroups.length > 0) {
  const dishId = dishWithGroups[0].dish_id;
  console.log('✅ Dish with modifier groups found: ID', dishId);
  
  // Test 6: Test validate_dish_customization
  console.log('\nTest 6: Testing validate_dish_customization()...');
  const { data: validationData, error: val_error } = await supabase
    .rpc('validate_dish_customization', {
      p_dish_id: dishId,
      p_selected_modifiers: []
    });
  
  if (val_error) {
    console.error('❌ validate_dish_customization error:', val_error);
  } else {
    console.log('✅ validate_dish_customization succeeded');
    console.log('   Result:', JSON.stringify(validationData, null, 2));
  }
  
  // Test 7: Test calculate_dish_price
  console.log('\nTest 7: Testing calculate_dish_price()...');
  const { data: priceData, error: price_error } = await supabase
    .rpc('calculate_dish_price', {
      p_dish_id: dishId,
      p_size_code: 'default',
      p_modifiers: []
    });
  
  if (price_error) {
    console.error('❌ calculate_dish_price error:', price_error);
  } else {
    console.log('✅ calculate_dish_price succeeded');
    console.log('   Result:', JSON.stringify(priceData, null, 2));
  }
}

console.log('\n✅ Integration tests complete!');
