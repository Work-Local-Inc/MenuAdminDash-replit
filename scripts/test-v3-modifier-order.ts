import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'menuca_v3' } });

async function testRPC(restaurantId: number, name: string) {
  console.log(`\n=== Testing RPC for ${name} (${restaurantId}) ===\n`);
  
  const { data, error } = await (supabase as any)
    .schema('menuca_v3')
    .rpc('get_restaurant_menu', {
      p_restaurant_id: restaurantId,
      p_language_code: 'en'
    });
  
  if (error) {
    console.log('RPC Error:', error);
    return;
  }
  
  // Find dishes with modifier_groups and show ordering
  const courses = data?.courses || [];
  
  for (const course of courses) {
    for (const dish of course.dishes || []) {
      if (dish.modifier_groups?.length > 1) {
        console.log(`Dish: ${dish.name}`);
        console.log('Modifier groups order:');
        dish.modifier_groups.forEach((mg: any, idx: number) => {
          console.log(`  ${idx + 1}. ${mg.name} (display_order: ${mg.display_order})`);
        });
        console.log('---');
        // Show first 3 dishes with multiple modifier groups
      }
    }
  }
}

async function main() {
  await testRPC(977, 'Capri Pizza');    // V2 - Broken ordering
}

main();
