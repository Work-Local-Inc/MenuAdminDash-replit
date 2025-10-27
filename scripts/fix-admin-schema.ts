import { Pool } from 'pg';

async function fixAdminSchema() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_BRANCH_DB_URL,
  });

  try {
    console.log('Checking admin_users table structure...\n');
    
    // Check what columns exist
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'menuca_v3' 
      AND table_name = 'admin_users'
      ORDER BY ordinal_position;
    `);
    
    console.log('Current columns in admin_users:');
    columns.rows.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
    
    // Add missing columns if they don't exist
    const existingColumns = columns.rows.map(r => r.column_name);
    
    console.log('\nAdding missing columns...');
    
    if (!existingColumns.includes('role_id')) {
      console.log('  Adding role_id column...');
      await pool.query(`
        ALTER TABLE menuca_v3.admin_users 
        ADD COLUMN IF NOT EXISTS role_id BIGINT REFERENCES menuca_v3.admin_roles(id);
      `);
      console.log('  ✓ role_id added');
    }
    
    if (!existingColumns.includes('first_name')) {
      console.log('  Adding first_name column...');
      await pool.query(`
        ALTER TABLE menuca_v3.admin_users 
        ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
      `);
      console.log('  ✓ first_name added');
    }
    
    if (!existingColumns.includes('last_name')) {
      console.log('  Adding last_name column...');
      await pool.query(`
        ALTER TABLE menuca_v3.admin_users 
        ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
      `);
      console.log('  ✓ last_name added');
    }
    
    if (!existingColumns.includes('password_hash')) {
      console.log('  Adding password_hash column...');
      await pool.query(`
        ALTER TABLE menuca_v3.admin_users 
        ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
      `);
      console.log('  ✓ password_hash added');
    }
    
    if (!existingColumns.includes('mfa_enabled')) {
      console.log('  Adding mfa_enabled column...');
      await pool.query(`
        ALTER TABLE menuca_v3.admin_users 
        ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false;
      `);
      console.log('  ✓ mfa_enabled added');
    }
    
    if (!existingColumns.includes('deleted_at')) {
      console.log('  Adding deleted_at column...');
      await pool.query(`
        ALTER TABLE menuca_v3.admin_users 
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      `);
      console.log('  ✓ deleted_at added');
    }

    // Now add the user
    console.log('\nAdding brian+1@worklocal.ca as Super Admin...');
    await pool.query(`
      INSERT INTO menuca_v3.admin_users (email, first_name, last_name, role_id, mfa_enabled)
      VALUES ('brian+1@worklocal.ca', 'Brian', 'Admin', 1, false)
      ON CONFLICT (email) DO UPDATE 
      SET role_id = 1, first_name = 'Brian', last_name = 'Admin';
    `);
    console.log('✓ User added/updated');

    // Verify
    console.log('\nVerifying setup...');
    const verification = await pool.query(`
      SELECT 
        au.id,
        au.email,
        au.first_name,
        au.last_name,
        ar.name as role_name,
        au.mfa_enabled,
        au.created_at
      FROM menuca_v3.admin_users au
      LEFT JOIN menuca_v3.admin_roles ar ON au.role_id = ar.id
      WHERE au.email = 'brian+1@worklocal.ca';
    `);
    
    console.log('\n✅ SUCCESS! Admin user:');
    console.log(verification.rows[0]);
    
    // Check database stats
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM menuca_v3.restaurants WHERE status = 'active') as active_restaurants,
        (SELECT COUNT(*) FROM menuca_v3.restaurants) as total_restaurants,
        (SELECT COUNT(*) FROM menuca_v3.users) as total_users;
    `);
    
    console.log('\n✅ Database Stats:');
    console.log(`   Active Restaurants: ${stats.rows[0].active_restaurants}`);
    console.log(`   Total Restaurants: ${stats.rows[0].total_restaurants}`);
    console.log(`   Total Users: ${stats.rows[0].total_users}`);
    
    console.log('\n🎉 All done! Refresh your dashboard now!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixAdminSchema();
