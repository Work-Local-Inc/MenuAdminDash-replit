import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres.nthpbtdjhhnwfxqsxbvy:Gz35CPTom1RnsmGM@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
});

async function test() {
  try {
    console.log('🔌 Testing Supabase Session Pooler connection...\n');
    
    const client = await pool.connect();
    console.log('✅ Connected to Supabase via Session Pooler!\n');
    
    // Check schema
    const schemaCheck = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'menuca_v3'
    `);
    
    if (schemaCheck.rows.length > 0) {
      console.log('✅ menuca_v3 schema found!\n');
      
      // Count records
      const restaurantsCount = await client.query('SELECT COUNT(*) FROM menuca_v3.restaurants');
      const ordersCount = await client.query('SELECT COUNT(*) FROM menuca_v3.orders');
      const usersCount = await client.query('SELECT COUNT(*) FROM menuca_v3.users');
      
      console.log('📈 PRODUCTION Data Counts:');
      console.log('   - Restaurants:', restaurantsCount.rows[0].count);
      console.log('   - Orders:', ordersCount.rows[0].count);
      console.log('   - Users:', usersCount.rows[0].count);
      
      // Sample data
      const sampleRestaurant = await client.query('SELECT id, name, city, province, status FROM menuca_v3.restaurants ORDER BY id LIMIT 5');
      console.log('\n🍽️  Sample Restaurants from PRODUCTION:');
      sampleRestaurant.rows.forEach(r => {
        console.log(`   - [${r.id}] ${r.name} (${r.city}, ${r.province}) - ${r.status}`);
      });
      
    } else {
      console.log('❌ menuca_v3 schema NOT found');
    }
    
    client.release();
    await pool.end();
    console.log('\n🎉 SUCCESS! Connected to your real Supabase database!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
