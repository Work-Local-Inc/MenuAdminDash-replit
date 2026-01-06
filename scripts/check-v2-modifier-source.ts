import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const v3 = createClient(supabaseUrl, supabaseKey, { db: { schema: 'menuca_v3' } });

async function checkV2ModifierSource() {
  const restaurantId = 977;  // Capri Pizza
  console.log('=== Checking modifier data sources for Capri Pizza (977) ===\n');
  
  // Get a sample dish
  const { data: dishes } = await v3
    .from('dishes')
    .select('id, name, source_system')
    .eq('restaurant_id', restaurantId)
    .limit(5);
  
  if (!dishes || dishes.length === 0) {
    console.log('No dishes found');
    return;
  }
  
  console.log('Sample dishes (source_system):', dishes.map(d => ({ name: d.name, source: d.source_system })));
  
  const dishIds = dishes.map(d => d.id);
  
  // Check modifier_group_details (for linked/global modifiers)
  const { data: mgd, error: mgdError } = await v3
    .from('modifier_group_details')
    .select('dish_id, name, display_order')
    .in('dish_id', dishIds)
    .order('display_order', { ascending: true });
  
  if (mgdError) {
    console.log('\nmodifier_group_details error:', mgdError.message);
  } else {
    console.log('\nmodifier_group_details:');
    mgd?.forEach(m => console.log(`  - ${m.name} (display_order: ${m.display_order})`));
  }
  
  // Check direct modifier_groups (for dish-specific modifiers)
  const { data: mg, error: mgError } = await v3
    .from('modifier_groups')
    .select('dish_id, name, display_order')
    .in('dish_id', dishIds)
    .order('display_order', { ascending: true });
  
  if (mgError) {
    console.log('\nmodifier_groups error:', mgError.message);
  } else {
    console.log('\nmodifier_groups (direct on dish):');
    mg?.forEach(m => console.log(`  dish ${m.dish_id}: ${m.name} (display_order: ${m.display_order})`));
  }
}

checkV2ModifierSource();
