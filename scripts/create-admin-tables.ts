import { Pool } from 'pg';

async function createAdminTables() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_BRANCH_DB_URL,
  });

  try {
    console.log('Connecting to Supabase database...');
    
    // Step 1: Create admin_roles table
    console.log('\n1. Creating admin_roles table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menuca_v3.admin_roles (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        permissions JSONB NOT NULL,
        is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ admin_roles table created');

    // Step 2: Insert default roles
    console.log('\n2. Inserting default roles...');
    await pool.query(`
      INSERT INTO menuca_v3.admin_roles (name, description, permissions, is_system_role) VALUES
      ('Super Admin', 'Full platform access', '{"page_access": ["*"], "restaurant_access": ["*"]}'::jsonb, true),
      ('Restaurant Manager', 'Manage assigned restaurants', '{"page_access": ["menu", "deals", "orders", "analytics"], "restaurant_access": ["assigned"]}'::jsonb, true),
      ('Staff', 'View-only access', '{"page_access": ["orders"], "restaurant_access": ["assigned"]}'::jsonb, true)
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('✓ Default roles inserted');

    // Step 3: Create admin_users table
    console.log('\n3. Creating admin_users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menuca_v3.admin_users (
        id BIGSERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        password_hash VARCHAR(255),
        role_id BIGINT REFERENCES menuca_v3.admin_roles(id),
        mfa_enabled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );
    `);
    console.log('✓ admin_users table created');

    // Step 4: Create indexes
    console.log('\n4. Creating indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_users_email ON menuca_v3.admin_users(email);
      CREATE INDEX IF NOT EXISTS idx_admin_users_deleted ON menuca_v3.admin_users(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_admin_users_role ON menuca_v3.admin_users(role_id);
    `);
    console.log('✓ Indexes created');

    // Step 5: Create admin_user_restaurants junction table
    console.log('\n5. Creating admin_user_restaurants table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menuca_v3.admin_user_restaurants (
        id BIGSERIAL PRIMARY KEY,
        admin_user_id BIGINT NOT NULL REFERENCES menuca_v3.admin_users(id) ON DELETE CASCADE,
        restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id) ON DELETE CASCADE,
        role_id BIGINT REFERENCES menuca_v3.admin_roles(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (admin_user_id, restaurant_id)
      );
    `);
    console.log('✓ admin_user_restaurants table created');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_user_restaurants_admin ON menuca_v3.admin_user_restaurants(admin_user_id);
      CREATE INDEX IF NOT EXISTS idx_admin_user_restaurants_restaurant ON menuca_v3.admin_user_restaurants(restaurant_id);
    `);

    // Step 6: Add brian+1@worklocal.ca as Super Admin
    console.log('\n6. Adding brian+1@worklocal.ca as Super Admin...');
    const result = await pool.query(`
      INSERT INTO menuca_v3.admin_users (email, first_name, last_name, role_id)
      VALUES ('brian+1@worklocal.ca', 'Brian', 'Admin', 1)
      ON CONFLICT (email) DO UPDATE SET role_id = 1
      RETURNING id, email, first_name, role_id;
    `);
    console.log('✓ Admin user created:', result.rows[0]);

    // Step 7: Verify
    console.log('\n7. Verifying setup...');
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
    
    console.log('\n✅ SUCCESS! Admin user verified:');
    console.log(verification.rows[0]);
    
    // Count restaurants to show database is accessible
    const restaurantCount = await pool.query(`
      SELECT COUNT(*) FROM menuca_v3.restaurants WHERE restaurant_status = 'active';
    `);
    console.log(`\n✅ Database connected! Found ${restaurantCount.rows[0].count} active restaurants`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createAdminTables();
