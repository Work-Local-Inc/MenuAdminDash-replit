import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_BRANCH_DB_URL,
});

async function checkSchema() {
  try {
    console.log('🔍 Checking Production Database Schema...\n');
    
    const client = await pool.connect();
    
    // Get restaurants table columns
    const restaurantsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'menuca_v3' AND table_name = 'restaurants'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 RESTAURANTS table columns:');
    restaurantsColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Get orders table columns
    const ordersColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'menuca_v3' AND table_name = 'orders'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 ORDERS table columns:');
    ordersColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Get users table columns
    const usersColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'menuca_v3' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 USERS table columns:');
    usersColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Sample restaurant to see actual data
    const sampleRestaurant = await client.query('SELECT * FROM menuca_v3.restaurants LIMIT 1');
    console.log('\n🍽️  Sample Restaurant Data:');
    console.log(JSON.stringify(sampleRestaurant.rows[0], null, 2));
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Schema check complete!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
