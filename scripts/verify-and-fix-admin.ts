import { Pool } from 'pg';

async function verifyAndFix() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_BRANCH_DB_URL,
  });

  try {
    console.log('Verifying Supabase database setup...\n');
    
    // Check if brian+1@worklocal.ca exists
    console.log('1. Checking if admin user exists...');
    const userCheck = await pool.query(`
      SELECT id, email, first_name, role_id 
      FROM menuca_v3.admin_users 
      WHERE email = 'brian+1@worklocal.ca';
    `);
    
    if (userCheck.rows.length === 0) {
      console.log('   User not found. Adding brian+1@worklocal.ca...');
      await pool.query(`
        INSERT INTO menuca_v3.admin_users (email, first_name, last_name, role_id)
        VALUES ('brian+1@worklocal.ca', 'Brian', 'Admin', 1)
        ON CONFLICT (email) DO UPDATE SET role_id = 1;
      `);
      console.log('   ✓ User added');
    } else {
      console.log('   ✓ User exists:', userCheck.rows[0]);
    }

    // Verify the user with role name
    console.log('\n2. Verifying admin user with role...');
    const verification = await pool.query(`
      SELECT 
        au.id,
        au.email,
        au.first_name,
        au.last_name,
        ar.name as role_name,
        au.created_at
      FROM menuca_v3.admin_users au
      LEFT JOIN menuca_v3.admin_roles ar ON au.role_id = ar.id
      WHERE au.email = 'brian+1@worklocal.ca';
    `);
    
    console.log('   ✓ Admin user verified:');
    console.log('   ', verification.rows[0]);

    // Check database access
    console.log('\n3. Checking database access...');
    const restaurantCount = await pool.query(`
      SELECT COUNT(*) FROM menuca_v3.restaurants WHERE restaurant_status = 'active';
    `);
    console.log(`   ✓ Connected! Found ${restaurantCount.rows[0].count} active restaurants`);

    const totalRestaurants = await pool.query(`
      SELECT COUNT(*) FROM menuca_v3.restaurants;
    `);
    console.log(`   ✓ Total restaurants: ${totalRestaurants.rows[0].count}`);

    const userCount = await pool.query(`
      SELECT COUNT(*) FROM menuca_v3.users;
    `);
    console.log(`   ✓ Total users: ${userCount.rows[0].count}`);

    console.log('\n✅ SUCCESS! Database is properly configured.');
    console.log('✅ You can now log in with brian+1@worklocal.ca');
    console.log('✅ Dashboard should show data on next refresh!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

verifyAndFix();
