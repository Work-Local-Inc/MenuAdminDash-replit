import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'menuca_v3' }
});

async function checkDish(dishId: number) {
  console.log(`\n=== Checking dish ${dishId} ===\n`);
  
  const { data, error } = await supabase
    .from('dishes')
    .select('id, name, is_combo, restaurant_id')
    .eq('id', dishId)
    .single();
  
  console.log('Dish data:', error ? error : data);
  
  // Check any combo dishes for restaurant 977
  const { data: allDishes, error: allError } = await supabase
    .from('dishes')
    .select('id, name, is_combo')
    .eq('restaurant_id', 977)
    .ilike('name', '%combo%')
    .limit(10);
  
  console.log('\nDishes with "combo" in name at restaurant 977:', allError ? allError : allDishes);
}

checkDish(171874);
