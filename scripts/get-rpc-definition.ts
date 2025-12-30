import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getRPCDefinition() {
  // Query the function definition from pg_proc
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc 
      WHERE proname = 'get_restaurant_menu' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'menuca_v3')
    `
  });
  
  if (error) {
    console.log('Error:', error);
    
    // Try alternative approach - get schema from functions
    console.log('\nTrying alternative approach...');
    
    // Check if function exists
    const { data: funcs, error: funcsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT routine_name, routine_schema
        FROM information_schema.routines 
        WHERE routine_name LIKE '%restaurant_menu%'
      `
    });
    
    console.log('Functions matching pattern:', funcs || funcsError);
    return;
  }
  
  console.log('RPC Definition:');
  console.log(data);
}

getRPCDefinition();
