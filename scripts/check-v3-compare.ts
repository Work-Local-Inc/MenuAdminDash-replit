import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'menuca_v3' }
});

async function checkBothRestaurants() {
  console.log('=== Restaurant 735 (amicci-pizza) - WORKS ===\n');
  
  // Check modifier_groups for 735
  const { data: mg735, error: mg735Error } = await supabase
    .from('modifier_groups')
    .select('id, name, category')
    .eq('restaurant_id', 735)
    .limit(10);
  
  console.log('modifier_groups count:', mg735Error ? mg735Error : (mg735?.length || 0));
  if (mg735 && mg735.length > 0) {
    console.log('Sample groups:', mg735.slice(0, 3));
  }
  
  // Check dish_modifier_groups for a working dish (Cheese Pizza - 132351)
  const { data: dmg735, error: dmg735Error } = await supabase
    .from('dish_modifier_groups')
    .select('id, dish_id, modifier_group_id')
    .eq('dish_id', 132351);
  
  console.log('dish_modifier_groups for dish 132351:', dmg735Error ? dmg735Error : dmg735);
  
  console.log('\n=== Restaurant 977 (Capri Pizza) - BROKEN ===\n');
  
  // Check modifier_groups for 977
  const { data: mg977, error: mg977Error } = await supabase
    .from('modifier_groups')
    .select('id, name, category')
    .eq('restaurant_id', 977)
    .limit(10);
  
  console.log('modifier_groups count:', mg977Error ? mg977Error : (mg977?.length || 0));
  
  // Check dish_modifier_groups for the broken dish
  const { data: dmg977, error: dmg977Error } = await supabase
    .from('dish_modifier_groups')
    .select('id, dish_id, modifier_group_id')
    .eq('dish_id', 171874);
  
  console.log('dish_modifier_groups for dish 171874:', dmg977Error ? dmg977Error : dmg977);
}

checkBothRestaurants();
