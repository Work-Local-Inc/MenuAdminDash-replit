import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_BRANCH_DB_URL || process.env.DATABASE_URL,
  });

  try {
    console.log('========================================');
    console.log('Running Migration 011');
    console.log('Enable Library Templates');
    console.log('========================================\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '011_enable_library_templates_combined.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('✓ Migration file loaded');
    console.log(`✓ File: ${migrationPath}\n`);

    // Execute the migration
    console.log('Executing migration...\n');
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('========================================');
    console.log('What was changed:');
    console.log('========================================');
    console.log('1. ✓ course_id is now nullable (enables global library templates)');
    console.log('2. ✓ apply_template_to_dish() fixed (no longer clones modifiers)\n');
    
    console.log('========================================');
    console.log('Next Steps:');
    console.log('========================================');
    console.log('3. Run: tsx scripts/migrate-to-library-linking.ts --confirm');
    console.log('4. Verify: tsx lib/supabase/check-migrations.ts\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:');
    console.error('─────────────────────────────────────');
    console.error('Message:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
    if (error.position) console.error('Position:', error.position);
    console.error('\nStack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

