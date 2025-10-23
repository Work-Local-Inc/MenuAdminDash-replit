import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres',
});

async function test() {
  try {
    console.log('🔌 Testing Supabase connection...\n');
    
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
      
      // Count records
      const restaurantsCount = await client.query('SELECT COUNT(*) FROM menuca_v3.restaurants');
      const ordersCount = await client.query('SELECT COUNT(*) FROM menuca_v3.orders');
      const usersCount = await client.query('SELECT COUNT(*) FROM menuca_v3.users');
      
      console.log('📈 Production Data Counts:');
      console.log('   - Restaurants:', restaurantsCount.rows[0].count);
      console.log('   - Orders:', ordersCount.rows[0].count);
      console.log('   - Users:', usersCount.rows[0].count);
      
      // Sample data
      const sampleRestaurant = await client.query('SELECT id, name, city, province, status FROM menuca_v3.restaurants LIMIT 3');
      console.log('\n🍽️  Sample Restaurants:');
      sampleRestaurant.rows.forEach(r => {
        console.log(`   - ${r.name} (${r.city}, ${r.province}) - ${r.status}`);
      });
      
    } else {
      console.log('❌ menuca_v3 schema NOT found');
    }
    
    client.release();
    await pool.end();
    console.log('\n✅ Connection test successful!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

test();
