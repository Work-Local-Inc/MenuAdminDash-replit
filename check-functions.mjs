import pool from './lib/db/postgres.ts';

const result = await pool.query(`
  SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'menuca_v3' 
    AND p.proname IN ('get_restaurant_menu', 'validate_dish_customization', 'calculate_dish_price')
  ORDER BY p.proname
`);

console.log('Available SQL functions in menuca_v3:\n');
result.rows.forEach(row => {
  console.log(`  ${row.function_name}(${row.arguments || 'no args'})`);
});

process.exit(0);
