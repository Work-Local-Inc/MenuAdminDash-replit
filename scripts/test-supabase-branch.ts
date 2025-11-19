import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_BRANCH_DB_URL,
});

async function test() {
  try {
    console.log('🔌 Testing Supabase branch connection...\n');
    
    const client = await pool.connect();
    console.log('✅ Connected to Supabase!\n');
    
    // Check schema
    const schemaCheck = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'menuca_v3'
    `);
    
    if (schemaCheck.rows.length > 0) {
      console.log('✅ menuca_v3 schema found!\n');
      
      // Check tables
      const tablesCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'menuca_v3'
        ORDER BY table_name
      `);
      
      console.log('📊 Tables in menuca_v3:');
      tablesCheck.rows.forEach(row => console.log('   -', row.table_name));
      
      // Count records
      const restaurantsCount = await client.query('SELECT COUNT(*) FROM menuca_v3.restaurants');
      const ordersCount = await client.query('SELECT COUNT(*) FROM menuca_v3.orders');
      const usersCount = await client.query('SELECT COUNT(*) FROM menuca_v3.users');
      
      console.log('\n📈 Production Data:');
      console.log('   - Restaurants:', restaurantsCount.rows[0].count);
      console.log('   - Orders:', ordersCount.rows[0].count);
      console.log('   - Users:', usersCount.rows[0].count);
      
      // Sample a restaurant
      const sampleRestaurant = await client.query('SELECT id, name, city, province FROM menuca_v3.restaurants LIMIT 1');
      if (sampleRestaurant.rows.length > 0) {
        console.log('\n🍽️  Sample Restaurant:');
        console.log('   ', JSON.stringify(sampleRestaurant.rows[0], null, 2));
      }
      
    } else {
      console.log('❌ menuca_v3 schema NOT found');
    }
    
    client.release();
    await pool.end();
    console.log('\n✅ All checks passed!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
