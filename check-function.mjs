import pool from './lib/db/postgres.ts';

// Get function definition
const result = await pool.query(`
  SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'menuca_v3' 
    AND p.proname = 'get_restaurant_menu'
`);

console.log('Function details:');
result.rows.forEach(row => {
  console.log(`  Name: ${row.function_name}`);
  console.log(`  Arguments: ${row.arguments}`);
  console.log(`  Returns: ${row.return_type}`);
});

process.exit(0);
