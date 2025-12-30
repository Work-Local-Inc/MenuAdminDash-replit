import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const v3 = createClient(supabaseUrl, supabaseKey, { db: { schema: 'menuca_v3' } });

async function checkRestaurant(id: number, name: string) {
  // Check modifier_groups
  const { data: mg } = await v3
    .from('modifier_groups')
    .select('id')
    .eq('restaurant_id', id);
  
  // Check combo_groups
  const { data: cg } = await v3
    .from('combo_groups')
    .select('id')
    .eq('restaurant_id', id);
  
  // Check dishes
  const { data: dishes } = await v3
    .from('dishes')
    .select('id')
    .eq('restaurant_id', id)
    .limit(5);
  
  // Check dish_modifier_groups for those dishes
  let dmgCount = 0;
  if (dishes && dishes.length > 0) {
    const { data: dmg } = await v3
      .from('dish_modifier_groups')
      .select('id')
      .in('dish_id', dishes.map((d: any) => d.id));
    dmgCount = dmg?.length || 0;
  }
  
  console.log(`${name} (${id}): modifier_groups=${mg?.length || 0}, combo_groups=${cg?.length || 0}, dish_modifier_groups=${dmgCount}`);
}

async function main() {
  console.log('=== Checking Multiple Restaurants ===\n');
  
  // Test restaurants from our logs
  await checkRestaurant(735, 'Amicci Pizza');        // Known working
  await checkRestaurant(77, 'Lorenzo\'s Pizzeria');  // Screenshots
  await checkRestaurant(977, 'Capri Pizza');         // User's issue
  await checkRestaurant(1009, 'Econo Pizza');        // From logs
  await checkRestaurant(810, 'Papa Grecque');        // From logs
  await checkRestaurant(822, 'Papa Burger');         // From logs
  
  // Also check a few random ones to see the pattern
  const { data: restaurants } = await v3
    .from('restaurants')
    .select('id, name')
    .eq('status', 'active')
    .limit(10);
  
  console.log('\n=== Random Sample of Active Restaurants ===\n');
  
  for (const r of restaurants || []) {
    await checkRestaurant(r.id, r.name);
  }
}

main();
