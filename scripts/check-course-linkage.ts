import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const v3 = createClient(supabaseUrl, supabaseKey, { db: { schema: 'menuca_v3' } });

async function checkCourseLinkage() {
  console.log('=== Checking Course-Level Modifier Linkage ===\n');
  
  // Check for course_modifier tables
  const tables = [
    'course_modifier_groups',
    'course_modifier_templates', 
    'course_template_modifiers',
    'modifier_group_courses',
    'course_modifiers'
  ];
  
  for (const table of tables) {
    const { data, error } = await v3.from(table).select('*').limit(1);
    if (!error) {
      console.log(`✓ ${table} exists - columns:`, data?.[0] ? Object.keys(data[0]) : '(empty)');
      
      // Check if has data for restaurant 735 or 977
      if (data?.[0] && Object.keys(data[0]).includes('restaurant_id')) {
        const { count: c735 } = await v3.from(table).select('*', { count: 'exact', head: true }).eq('restaurant_id', 735);
        const { count: c977 } = await v3.from(table).select('*', { count: 'exact', head: true }).eq('restaurant_id', 977);
        console.log(`  Restaurant 735: ${c735}, Restaurant 977: ${c977}`);
      }
    } else if (error.code === 'PGRST116') {
      console.log(`✓ ${table} exists (empty)`);
    } else {
      console.log(`✗ ${table}: not found`);
    }
  }
  
  // Check modifier_group_details which we saw earlier has a dish_id column
  console.log('\n=== Checking modifier_group_details ===');
  
  const { data: mgd735 } = await v3
    .from('modifier_group_details')
    .select('*')
    .limit(5);
  console.log('Sample modifier_group_details:', mgd735);
  
  // Check if modifier_group_details has entries linked to working restaurants
  const { data: mgdByDish } = await v3
    .from('modifier_group_details')
    .select('dish_id, name')
    .not('dish_id', 'is', null)
    .limit(10);
  console.log('\nmodifier_group_details with dish_id:', mgdByDish);
}

checkCourseLinkage();
