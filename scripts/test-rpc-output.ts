import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPC(restaurantId: number, name: string) {
  console.log(`\n=== Testing RPC for ${name} (${restaurantId}) ===\n`);
  
  const { data, error } = await supabase.rpc('get_restaurant_menu', {
    p_restaurant_id: restaurantId,
    p_language_code: 'en'
  });
  
  if (error) {
    console.log('RPC Error:', error);
    return;
  }
  
  // Find a dish with modifier_groups or combo_groups
  const courses = data?.courses || [];
  let sampleDish = null;
  
  for (const course of courses) {
    for (const dish of course.dishes || []) {
      if ((dish.modifier_groups?.length > 0) || (dish.combo_groups?.length > 0)) {
        sampleDish = dish;
        break;
      }
    }
    if (sampleDish) break;
  }
  
  if (sampleDish) {
    console.log('Found dish with modifiers:', sampleDish.name);
    console.log('modifier_groups count:', sampleDish.modifier_groups?.length || 0);
    console.log('combo_groups count:', sampleDish.combo_groups?.length || 0);
    
    if (sampleDish.modifier_groups?.length > 0) {
      console.log('\nFirst modifier_group:', JSON.stringify(sampleDish.modifier_groups[0], null, 2));
    }
  } else {
    // Show first dish anyway
    const firstDish = courses[0]?.dishes?.[0];
    if (firstDish) {
      console.log('First dish (no modifiers found):', firstDish.name);
      console.log('modifier_groups:', firstDish.modifier_groups);
      console.log('combo_groups:', firstDish.combo_groups);
    }
  }
}

async function main() {
  await testRPC(735, 'Amicci Pizza');   // Works
  await testRPC(977, 'Capri Pizza');    // Broken
  await testRPC(1009, 'Econo Pizza');   // Has some data
}

main();
