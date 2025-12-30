import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Use menuca_v3 schema for RPC
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'menuca_v3' }
});

async function testRPC(restaurantId: number, name: string) {
  console.log(`\n=== ${name} (${restaurantId}) ===`);
  
  const { data, error } = await (supabase as any).rpc('get_restaurant_menu', {
    p_restaurant_id: restaurantId,
    p_language_code: 'en'
  });
  
  if (error) {
    console.log('RPC Error:', error.message);
    return;
  }
  
  const courses = data?.courses || [];
  let dishesWithModifiers = 0;
  let dishesWithCombos = 0;
  let totalDishes = 0;
  
  for (const course of courses) {
    for (const dish of course.dishes || []) {
      totalDishes++;
      if (dish.modifier_groups?.length > 0) dishesWithModifiers++;
      if (dish.combo_groups?.length > 0) dishesWithCombos++;
    }
  }
  
  console.log(`Total dishes: ${totalDishes}`);
  console.log(`Dishes with modifier_groups: ${dishesWithModifiers}`);
  console.log(`Dishes with combo_groups: ${dishesWithCombos}`);
  
  // Show a sample
  for (const course of courses) {
    for (const dish of course.dishes || []) {
      if (dish.modifier_groups?.length > 0 || dish.combo_groups?.length > 0) {
        console.log(`\nSample: "${dish.name}"`);
        console.log(`  modifier_groups: ${dish.modifier_groups?.length || 0}`);
        console.log(`  combo_groups: ${dish.combo_groups?.length || 0}`);
        if (dish.modifier_groups?.[0]) {
          console.log(`  First group: "${dish.modifier_groups[0].name}" with ${dish.modifier_groups[0].modifiers?.length || 0} modifiers`);
        }
        return;
      }
    }
  }
}

async function main() {
  await testRPC(735, 'Amicci Pizza');   // Works
  await testRPC(977, 'Capri Pizza');    // Broken
  await testRPC(77, 'Lorenzo\'s');      // Has data
  await testRPC(1009, 'Econo Pizza');   // Has some
}

main();
