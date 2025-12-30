import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Use public schema to query table info
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('=== Checking all menuca_v3 tables with "modifier" in the name ===\n');
  
  // Query for table names
  const { data, error } = await supabase
    .rpc('exec_sql', {
      sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'menuca_v3' AND table_name LIKE '%modifier%' ORDER BY table_name`
    });
  
  if (error) {
    console.log('RPC error, trying direct query...');
    
    // Try listing tables via Supabase admin
    const tables = [
      'modifier_groups',
      'modifiers', 
      'modifier_prices',
      'dish_modifier_groups',
      'modifier_group_details',
      'dish_modifiers',           // legacy?
      'dish_modifier_templates',  // possible?
      'template_modifiers',       // possible?
      'templates'                 // possible?
    ];
    
    const v3 = createClient(supabaseUrl, supabaseKey, { db: { schema: 'menuca_v3' } });
    
    for (const table of tables) {
      const { data, error } = await v3.from(table).select('*').limit(1);
      if (!error) {
        console.log(`✓ ${table} exists - sample:`, data?.[0] ? Object.keys(data[0]) : 'empty');
      } else if (error.code === 'PGRST116') {
        console.log(`✓ ${table} exists (empty)`);
      } else {
        console.log(`✗ ${table}: ${error.message}`);
      }
    }
  } else {
    console.log('Tables:', data);
  }
}

listTables();
