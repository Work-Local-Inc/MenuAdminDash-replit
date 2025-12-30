import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'menuca_v3' }
});

async function checkV3Schema() {
  console.log('=== Checking V3 modifier schema for dish 171874 ===\n');
  
  // 1. Check dish_modifier_groups junction
  const { data: dmg, error: dmgError } = await supabase
    .from('dish_modifier_groups')
    .select('*')
    .eq('dish_id', 171874);
  
  console.log('dish_modifier_groups for dish 171874:', dmgError ? dmgError : dmg);
  
  // 2. Check modifier_groups at restaurant level
  const { data: mg, error: mgError } = await supabase
    .from('modifier_groups')
    .select('id, name, restaurant_id, category')
    .eq('restaurant_id', 977)
    .limit(10);
  
  console.log('\nmodifier_groups for restaurant 977:', mgError ? mgError : mg);
  
  // 3. Check modifier_group_details if dish_modifier_groups exist
  if (dmg && dmg.length > 0) {
    const dmgIds = dmg.map((d: any) => d.id);
    const { data: mgd, error: mgdError } = await supabase
      .from('modifier_group_details')
      .select('*')
      .in('dish_modifier_group_id', dmgIds);
    
    console.log('\nmodifier_group_details:', mgdError ? mgdError : mgd);
  }
  
  // 4. Also check modifiers linked to any modifier_groups
  if (mg && mg.length > 0) {
    const mgIds = mg.map((g: any) => g.id);
    const { data: mods, error: modsError } = await supabase
      .from('modifiers')
      .select('id, name, modifier_group_id, is_active')
      .in('modifier_group_id', mgIds)
      .limit(20);
    
    console.log('\nmodifiers for restaurant 977 groups:', modsError ? modsError : mods);
  }
}

checkV3Schema();
