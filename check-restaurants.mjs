import pool from './lib/db/postgres.ts';

// Check restaurant table columns
const result = await pool.query(`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_schema = 'menuca_v3' AND table_name = 'restaurants'
  ORDER BY ordinal_position
`);

console.log('Restaurant table columns:');
result.rows.forEach(col => {
  console.log(`  ${col.column_name}: ${col.data_type}`);
});

// Get sample restaurant
const sample = await pool.query(`SELECT * FROM menuca_v3.restaurants LIMIT 1`);
console.log('\nSample restaurant:');
console.log(JSON.stringify(sample.rows[0], null, 2));

process.exit(0);
