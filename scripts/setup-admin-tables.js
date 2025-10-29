#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: { schema: 'menuca_v3' },
    auth: { persistSession: false }
  }
);

async function setupTables() {
  console.log('Setting up admin tables in Supabase menuca_v3 schema...\n');

  // Insert roles (assuming table exists)
  console.log('Inserting admin roles...');
  const { data: roles, error: rolesError } = await supabase
    .schema('menuca_v3')
    .from('admin_roles')
    .upsert([
      {
        id: 1,
        name: 'Super Admin',
        description: 'Full platform access',
        permissions: { page_access: ['*'], restaurant_access: ['*'], can_create_roles: [1, 2, 3, 5, 6] },
        is_system_role: true
      },
      {
        id: 2,
        name: 'Manager',
        description: 'Manager access',
        permissions: { page_access: ['restaurants', 'orders'], restaurant_access: ['assigned'], can_create_roles: [5, 6] },
        is_system_role: true
      },
      {
        id: 3,
        name: 'Support',
        description: 'Support access',
        permissions: { page_access: ['orders', 'customers'], restaurant_access: ['*'], can_create_roles: [5, 6] },
        is_system_role: true
      },
      {
        id: 5,
        name: 'Restaurant Manager',
        description: 'Manage assigned restaurants',
        permissions: { page_access: ['menu', 'deals', 'orders'], restaurant_access: ['assigned'] },
        is_system_role: true
      },
      {
        id: 6,
        name: 'Staff',
        description: 'View-only access',
        permissions: { page_access: ['orders'], restaurant_access: ['assigned'] },
        is_system_role: true
      }
    ], { onConflict: 'id' })
    .select();

  if (rolesError) {
    console.error('❌ Error inserting roles:', rolesError.message);
    console.log('Tables may not exist. Please run the SQL from migrations/000_create_admin_users_URGENT.sql in Supabase SQL Editor first.');
    process.exit(1);
  }

  console.log('✓ Roles inserted/updated:', roles?.length || 0);

  // Get auth user ID for brian+1@worklocal.ca
  console.log('\nLooking up auth user ID...');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error listing auth users:', authError.message);
    process.exit(1);
  }

  const brianUser = authUsers.users.find(u => u.email === 'brian+1@worklocal.ca');
  
  if (!brianUser) {
    console.error('❌ Auth user brian+1@worklocal.ca not found');
    process.exit(1);
  }

  console.log('✓ Found auth user:', brianUser.email, 'ID:', brianUser.id);

  // Insert/update admin user
  console.log('\nInserting admin user record...');
  const { data: adminUser, error: adminError } = await supabase
    .schema('menuca_v3')
    .from('admin_users')
    .upsert({
      email: 'brian+1@worklocal.ca',
      first_name: 'Brian',
      last_name: 'Admin',
      role_id: 1,
      status: 'active',
      auth_user_id: brianUser.id
    }, { onConflict: 'email' })
    .select();

  if (adminError) {
    console.error('❌ Error inserting admin user:', adminError.message);
    process.exit(1);
  }

  console.log('✓ Admin user created/updated:', adminUser);
  console.log('\n✅ Setup complete!');
}

setupTables().catch(console.error);
