import { Pool } from 'pg';

async function checkDatabaseData() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_BRANCH_DB_URL,
  });

  try {
    console.log('Checking Supabase database data...\n');
    
    // Check restaurants table
    console.log('1. RESTAURANTS');
    const restaurantColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'menuca_v3' AND table_name = 'restaurants'
      ORDER BY ordinal_position
      LIMIT 10;
    `);
    console.log('   Columns:', restaurantColumns.rows.map(r => r.column_name).join(', '));
    
    const restaurantCount = await pool.query(`SELECT COUNT(*) FROM menuca_v3.restaurants;`);
    console.log(`   Total restaurants: ${restaurantCount.rows[0].count}`);
    
    // Check what the status column is actually called
    const statusCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'menuca_v3' 
      AND table_name = 'restaurants' 
      AND column_name LIKE '%status%';
    `);
    console.log('   Status-related columns:', statusCheck.rows.map(r => r.column_name).join(', '));
    
    // Count active restaurants (try different column names)
    try {
      const activeByStatus = await pool.query(`
        SELECT COUNT(*) FROM menuca_v3.restaurants WHERE status = 'active';
      `);
      console.log(`   Active (status='active'): ${activeByStatus.rows[0].count}`);
    } catch (e: any) {
      console.log(`   'status' column doesn't exist:`, e.message);
    }
    
    try {
      const activeByRestaurantStatus = await pool.query(`
        SELECT COUNT(*) FROM menuca_v3.restaurants WHERE restaurant_status = 'active';
      `);
      console.log(`   Active (restaurant_status='active'): ${activeByRestaurantStatus.rows[0].count}`);
    } catch (e: any) {
      console.log(`   'restaurant_status' column doesn't exist:`, e.message);
    }
    
    // Sample restaurant
    const sampleRestaurant = await pool.query(`
      SELECT * FROM menuca_v3.restaurants LIMIT 1;
    `);
    console.log('\n   Sample restaurant (first 5 columns):');
    if (sampleRestaurant.rows[0]) {
      const keys = Object.keys(sampleRestaurant.rows[0]).slice(0, 10);
      keys.forEach(key => {
        console.log(`     ${key}: ${sampleRestaurant.rows[0][key]}`);
      });
    }
    
    // Check orders table
    console.log('\n2. ORDERS');
    const orderColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'menuca_v3' AND table_name = 'orders'
      ORDER BY ordinal_position
      LIMIT 10;
    `);
    console.log('   Columns:', orderColumns.rows.map(r => r.column_name).join(', '));
    
    const orderCount = await pool.query(`SELECT COUNT(*) FROM menuca_v3.orders;`);
    console.log(`   Total orders: ${orderCount.rows[0].count}`);
    
    // Check users table
    console.log('\n3. USERS');
    const userCount = await pool.query(`SELECT COUNT(*) FROM menuca_v3.users;`);
    console.log(`   Total users: ${userCount.rows[0].count}`);
    
    const activeUsers = await pool.query(`SELECT COUNT(*) FROM menuca_v3.users WHERE deleted_at IS NULL;`);
    console.log(`   Active users: ${activeUsers.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkDatabaseData();
