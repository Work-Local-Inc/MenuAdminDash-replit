// Quick check for combo_groups in the database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'menuca_v3' }
});

async function checkComboGroups(restaurantId: number) {
  console.log(`\n=== Checking combo_groups for restaurant ${restaurantId} ===\n`);
  
  // Check combo_groups table
  const { data: comboGroups, error: cgError } = await supabase
    .from('combo_groups')
    .select('id, name, restaurant_id, display_order')
    .eq('restaurant_id', restaurantId)
    .limit(10);
  
  console.log('combo_groups:', cgError ? cgError : comboGroups);
  
  // Check dishes that are combos
  const { data: comboDishes, error: cdError } = await supabase
    .from('dishes')
    .select('id, name, is_combo')
    .eq('restaurant_id', restaurantId)
    .eq('is_combo', true)
    .limit(10);
  
  console.log('combo dishes:', cdError ? cdError : comboDishes);
  
  // Check dish_combo_groups junction
  if (comboDishes && comboDishes.length > 0) {
    const dishIds = comboDishes.map(d => d.id);
    const { data: junctions, error: jError } = await supabase
      .from('dish_combo_groups')
      .select('dish_id, combo_group_id')
      .in('dish_id', dishIds);
    
    console.log('dish_combo_groups junctions:', jError ? jError : junctions);
  }
}

// Check both 977 (Capri) and 735 (amicci) for comparison
checkComboGroups(977);
setTimeout(() => checkComboGroups(735), 2000);
