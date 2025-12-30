import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const v3 = createClient(supabaseUrl, supabaseKey, { db: { schema: 'menuca_v3' } });

async function checkTemplateTables() {
  console.log('=== Checking for template/simple modifier tables ===\n');
  
  const tables = [
    'templates',
    'template_groups', 
    'template_modifiers',
    'dish_templates',
    'simple_modifiers',
    'single_modifiers',
    'combo_groups',
    'combo_group_sections',
    'combo_modifier_groups',
    'combo_modifiers'
  ];
  
  for (const table of tables) {
    const { data, error } = await v3.from(table).select('*').limit(1);
    if (!error) {
      console.log(`✓ ${table} - columns:`, data?.[0] ? Object.keys(data[0]) : '(empty)');
    } else if (error.code === 'PGRST116') {
      console.log(`✓ ${table} (exists but empty)`);
    } else if (error.message.includes('schema cache')) {
      console.log(`✗ ${table} - not found`);
    } else {
      console.log(`? ${table}: ${error.code} ${error.message}`);
    }
  }
  
  // Also check what tables have data for restaurant 977
  console.log('\n=== Checking what data exists for restaurant 977 ===\n');
  
  const { data: dishes977 } = await v3
    .from('dishes')
    .select('id, name')
    .eq('restaurant_id', 977)
    .limit(5);
  console.log('dishes (977):', dishes977?.length, 'total');
  
  // Check combo tables for 977
  const { data: combo977 } = await v3
    .from('combo_groups')
    .select('id, name')
    .eq('restaurant_id', 977);
  console.log('combo_groups (977):', combo977);
}

checkTemplateTables();
