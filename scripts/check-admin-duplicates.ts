import { Pool } from 'pg';

async function checkDuplicates() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_BRANCH_DB_URL,
  });

  try {
    console.log('Checking for duplicate admin users...\n');
    
    const duplicates = await pool.query(`
      SELECT email, COUNT(*) as count
      FROM menuca_v3.admin_users
      GROUP BY email
      HAVING COUNT(*) > 1;
    `);
    
    if (duplicates.rows.length > 0) {
      console.log('❌ Found duplicate emails:');
      console.log(duplicates.rows);
    } else {
      console.log('✓ No duplicates found');
    }
    
    console.log('\nAll admin users for brian+1@worklocal.ca:');
    const allBrian = await pool.query(`
      SELECT id, email, first_name, last_name, role_id, deleted_at, created_at
      FROM menuca_v3.admin_users
      WHERE email = 'brian+1@worklocal.ca';
    `);
    console.log(allBrian.rows);
    
    console.log('\nTesting Supabase query (same as auth check):');
    const authTest = await pool.query(`
      SELECT id, email, first_name, last_name
      FROM menuca_v3.admin_users
      WHERE email = 'brian+1@worklocal.ca'
      AND deleted_at IS NULL;
    `);
    console.log(`Found ${authTest.rows.length} rows:`);
    console.log(authTest.rows);
    
    if (authTest.rows.length > 1) {
      console.log('\n❌ PROBLEM: Multiple active rows found!');
      console.log('Keeping only the most recent one...');
      
      // Keep only the newest one
      await pool.query(`
        DELETE FROM menuca_v3.admin_users
        WHERE email = 'brian+1@worklocal.ca'
        AND id NOT IN (
          SELECT id FROM menuca_v3.admin_users
          WHERE email = 'brian+1@worklocal.ca'
          ORDER BY created_at DESC
          LIMIT 1
        );
      `);
      
      console.log('✓ Duplicates removed');
      
      const verify = await pool.query(`
        SELECT id, email, first_name, role_id
        FROM menuca_v3.admin_users
        WHERE email = 'brian+1@worklocal.ca'
        AND deleted_at IS NULL;
      `);
      console.log('\nRemaining user:');
      console.log(verify.rows[0]);
    } else if (authTest.rows.length === 1) {
      console.log('\n✅ Exactly 1 active user found - this is correct!');
    } else {
      console.log('\n❌ No active users found!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkDuplicates();
