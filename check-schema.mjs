import pool from './lib/db/postgres.ts';

console.log('🔍 Checking actual database schema...\n');

try {
  // Check dish_prices table structure
  console.log('1. Checking dish_prices table columns...');
  const dpColumns = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'menuca_v3' 
      AND table_name = 'dish_prices'
    ORDER BY ordinal_position
  `);
  
  console.log('   Columns:');
  dpColumns.rows.forEach(col => {
    console.log(`     - ${col.column_name}: ${col.data_type}`);
  });
  
  // Get sample data
  const dpSample = await pool.query(`
    SELECT * FROM menuca_v3.dish_prices LIMIT 1
  `);
  if (dpSample.rows.length > 0) {
    console.log('\n   Sample record:', JSON.stringify(dpSample.rows[0], null, 2));
  }

  // Check if get_restaurant_menu function exists
  console.log('\n2. Checking get_restaurant_menu function...');
  const funcCheck = await pool.query(`
    SELECT routine_name, routine_schema
    FROM information_schema.routines
    WHERE routine_schema = 'menuca_v3'
      AND routine_name LIKE '%menu%'
    ORDER BY routine_name
  `);
  
  console.log('   Functions found:');
  funcCheck.rows.forEach(func => {
    console.log(`     - ${func.routine_schema}.${func.routine_name}()`);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  process.exit(0);
}
