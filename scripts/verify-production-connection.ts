import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_BRANCH_DB_URL,
});

async function verify() {
  try {
    const client = await pool.connect();
    
    console.log('✅ Connected to Production Supabase Database\n');
    
    // Get real stats
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM menuca_v3.restaurants WHERE status = 'active') as active_restaurants,
        (SELECT COUNT(*) FROM menuca_v3.restaurants) as total_restaurants,
        (SELECT COUNT(*) FROM menuca_v3.users WHERE deleted_at IS NULL) as users,
        (SELECT COUNT(*) FROM menuca_v3.orders) as orders
    `);
    
    console.log('📊 Production Database Stats:');
    console.log(`   - Active Restaurants: ${stats.rows[0].active_restaurants} / ${stats.rows[0].total_restaurants} total`);
    console.log(`   - Users: ${stats.rows[0].users}`);
    console.log(`   - Orders: ${stats.rows[0].orders}`);
    
    // Sample active restaurant
    const restaurant = await client.query(`
      SELECT id, name, slug, status, online_ordering_enabled
      FROM menuca_v3.restaurants 
      WHERE status = 'active' AND online_ordering_enabled = true
      LIMIT 3
    `);
    
    console.log('\n🍽️  Sample Active Restaurants:');
    restaurant.rows.forEach(r => {
      console.log(`   - [${r.id}] ${r.name} (${r.slug})`);
    });
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Production database fully connected!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verify();
