import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const v3 = createClient(supabaseUrl, supabaseKey, { db: { schema: 'menuca_v3' } });

async function checkMGDForRestaurants() {
  console.log('=== Checking modifier_group_details by restaurant ===\n');
  
  // Get dishes for each restaurant
  const restaurants = [
    { id: 735, name: 'Amicci Pizza' },
    { id: 977, name: 'Capri Pizza' },
    { id: 77, name: "Lorenzo's" },
    { id: 1009, name: 'Econo Pizza' }
  ];
  
  for (const r of restaurants) {
    // Get dish IDs for this restaurant
    const { data: dishes } = await v3
      .from('dishes')
      .select('id')
      .eq('restaurant_id', r.id);
    
    if (dishes && dishes.length > 0) {
      const dishIds = dishes.map(d => d.id);
      
      // Count modifier_group_details for these dishes
      const { count: mgdCount } = await v3
        .from('modifier_group_details')
        .select('*', { count: 'exact', head: true })
        .in('dish_id', dishIds);
      
      console.log(`${r.name} (${r.id}): ${dishes.length} dishes, ${mgdCount} modifier_group_details entries`);
      
      // If has entries, show sample
      if (mgdCount && mgdCount > 0) {
        const { data: sample } = await v3
          .from('modifier_group_details')
          .select('dish_id, name, min_selections, max_selections')
          .in('dish_id', dishIds)
          .limit(3);
        console.log('  Sample:', sample);
      }
    }
  }
}

checkMGDForRestaurants();
