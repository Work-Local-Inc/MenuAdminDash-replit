import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const v3 = createClient(supabaseUrl, supabaseKey, { db: { schema: 'menuca_v3' } });

async function deepCheckCapri() {
  const restaurantId = 977;
  console.log('=== Deep Check: Capri Pizza (977) ===\n');
  
  // 1. Check if restaurant exists
  const { data: restaurant } = await v3
    .from('restaurants')
    .select('id, name, status, created_at')
    .eq('id', restaurantId)
    .single();
  console.log('Restaurant:', restaurant);
  
  // 2. Count dishes
  const { count: dishCount } = await v3
    .from('dishes')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);
  console.log('\nTotal dishes:', dishCount);
  
  // 3. Check modifier_groups in ALL possible ways
  console.log('\n--- Checking modifier_groups ---');
  
  // By restaurant_id
  const { data: mgByRestaurant } = await v3
    .from('modifier_groups')
    .select('id, name, restaurant_id')
    .eq('restaurant_id', restaurantId);
  console.log('modifier_groups by restaurant_id:', mgByRestaurant?.length);
  
  // 4. Check if dishes have direct modifier linkage (older schema)
  const { data: dishes } = await v3
    .from('dishes')
    .select('id, name')
    .eq('restaurant_id', restaurantId)
    .limit(3);
  
  if (dishes && dishes.length > 0) {
    console.log('\n--- Checking dish linkages ---');
    
    // Check dish_modifier_groups
    const { data: dmg } = await v3
      .from('dish_modifier_groups')
      .select('*')
      .in('dish_id', dishes.map(d => d.id));
    console.log('dish_modifier_groups for sample dishes:', dmg);
    
    // Check if there's a legacy modifier_groups.dish_id column
    const { data: mgByDish, error: mgByDishError } = await v3
      .from('modifier_groups')
      .select('id, name')
      .in('dish_id', dishes.map(d => d.id));
    
    if (mgByDishError) {
      console.log('modifier_groups.dish_id column check:', mgByDishError.message);
    } else {
      console.log('modifier_groups by dish_id:', mgByDish);
    }
  }
  
  // 5. Check combo_groups
  const { data: cg } = await v3
    .from('combo_groups')
    .select('id, name')
    .eq('restaurant_id', restaurantId);
  console.log('\ncombo_groups:', cg);
  
  // 6. Check dish_combo_groups
  if (dishes && dishes.length > 0) {
    const { data: dcg } = await v3
      .from('dish_combo_groups')
      .select('*')
      .in('dish_id', dishes.map(d => d.id));
    console.log('dish_combo_groups:', dcg);
  }
  
  // 7. Compare with working restaurant (735)
  console.log('\n=== Comparison: Amicci Pizza (735) ===');
  
  const { data: mg735 } = await v3
    .from('modifier_groups')
    .select('id, name, restaurant_id')
    .eq('restaurant_id', 735)
    .limit(3);
  console.log('Amicci modifier_groups sample:', mg735);
  
  // Check how 735's modifiers are linked
  const { data: dishes735 } = await v3
    .from('dishes')
    .select('id')
    .eq('restaurant_id', 735)
    .limit(3);
  
  if (dishes735?.length > 0) {
    const { data: dmg735 } = await v3
      .from('dish_modifier_groups')
      .select('*')
      .in('dish_id', dishes735.map(d => d.id));
    console.log('Amicci dish_modifier_groups sample:', dmg735);
  }
}

deepCheckCapri();
