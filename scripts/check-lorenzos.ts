import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const v3 = createClient(supabaseUrl, supabaseKey, { db: { schema: 'menuca_v3' } });

async function checkLorenzos() {
  // Lorenzo's is restaurant 77 based on slug
  const restaurantId = 77;
  
  console.log(`=== Checking Lorenzo's Pizzeria (${restaurantId}) ===\n`);
  
  // Check modifier_groups at restaurant level
  const { data: mg, error: mgError } = await v3
    .from('modifier_groups')
    .select('id, name, category')
    .eq('restaurant_id', restaurantId)
    .limit(20);
  
  console.log('modifier_groups:', mgError ? mgError : mg);
  
  // Search for specific modifiers mentioned in screenshots
  if (mg && mg.length > 0) {
    // Check for "Crust type" or similar
    const crustGroups = mg.filter((g: any) => 
      g.name.toLowerCase().includes('crust') || 
      g.name.toLowerCase().includes('topping') ||
      g.name.toLowerCase().includes('dip')
    );
    console.log('\nRelevant groups (crust/topping/dip):', crustGroups);
    
    // Get modifiers for first group
    if (mg.length > 0) {
      const { data: mods } = await v3
        .from('modifiers')
        .select('id, name, is_active')
        .eq('modifier_group_id', mg[0].id)
        .limit(10);
      console.log(`\nSample modifiers from "${mg[0].name}":`, mods);
    }
  }
  
  // Check combo_groups
  const { data: cg, error: cgError } = await v3
    .from('combo_groups')
    .select('id, name')
    .eq('restaurant_id', restaurantId)
    .limit(10);
  
  console.log('\ncombo_groups:', cgError ? cgError : cg);
  
  // Also check dish_modifier_groups
  const { data: dishes } = await v3
    .from('dishes')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .limit(5);
  
  if (dishes && dishes.length > 0) {
    const { data: dmg } = await v3
      .from('dish_modifier_groups')
      .select('id, dish_id, modifier_group_id')
      .in('dish_id', dishes.map((d: any) => d.id));
    console.log('\ndish_modifier_groups (sample):', dmg);
  }
}

checkLorenzos();
