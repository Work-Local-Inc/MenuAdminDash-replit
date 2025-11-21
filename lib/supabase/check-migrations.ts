import { Pool } from 'pg';

interface MigrationStatus {
  migration009_course_id_nullable: boolean;
  migration010_function_updated: boolean;
  library_template_id_column_exists: boolean;
  overall_ready: boolean;
  warnings: string[];
  details: {
    course_id_nullable?: string;
    function_source?: string;
    library_template_id_exists?: boolean;
  };
}

/**
 * Check if database migrations for library linking are applied
 * 
 * This checks:
 * 1. Migration 009: library_template_id column exists in course_modifier_templates
 * 2. Migration 009: course_id is nullable in course_modifier_templates
 * 3. Migration 010: apply_template_to_dish function is updated (no modifier cloning)
 */
export async function checkLibraryLinkingMigrations(): Promise<MigrationStatus> {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_BRANCH_DB_URL,
  });

  const status: MigrationStatus = {
    migration009_course_id_nullable: false,
    migration010_function_updated: false,
    library_template_id_column_exists: false,
    overall_ready: false,
    warnings: [],
    details: {}
  };

  try {
    // Check 1: library_template_id column exists
    const columnCheckQuery = `
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_schema = 'menuca_v3'
      AND table_name = 'course_modifier_templates'
      AND column_name = 'library_template_id';
    `;
    const { rows: columnCheck } = await pool.query(columnCheckQuery);
    
    if (columnCheck.length > 0) {
      status.library_template_id_column_exists = true;
      status.details.library_template_id_exists = true;
    } else {
      status.library_template_id_column_exists = false;
      status.warnings.push('⚠️  Migration 009 NOT applied: library_template_id column missing');
    }

    // Check 2: course_id is nullable (allows library templates with course_id = NULL)
    const courseIdCheckQuery = `
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_schema = 'menuca_v3'
      AND table_name = 'course_modifier_templates'
      AND column_name = 'course_id';
    `;
    const { rows: courseIdCheck } = await pool.query(courseIdCheckQuery);
    
    if (courseIdCheck.length > 0) {
      const isNullable = courseIdCheck[0].is_nullable === 'YES';
      status.migration009_course_id_nullable = isNullable;
      status.details.course_id_nullable = courseIdCheck[0].is_nullable;
      
      if (!isNullable) {
        status.warnings.push('⚠️  Migration 009 NOT applied: course_id is NOT NULL (should be nullable)');
      }
    } else {
      status.warnings.push('⚠️  course_id column not found in course_modifier_templates');
    }

    // Check 3: apply_template_to_dish function exists and is updated
    const functionCheckQuery = `
      SELECT 
        p.proname as function_name,
        pg_get_functiondef(p.oid) as function_def
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'menuca_v3'
      AND p.proname = 'apply_template_to_dish';
    `;
    const { rows: functionCheck } = await pool.query(functionCheckQuery);
    
    if (functionCheck.length > 0) {
      const functionDef = functionCheck[0].function_def;
      status.details.function_source = functionDef;
      
      // Check if function contains INSERT INTO dish_modifiers (OLD behavior - cloning)
      const hasModifierCloning = functionDef.includes('INSERT INTO dish_modifiers') ||
                                 functionDef.includes('INSERT INTO menuca_v3.dish_modifiers');
      
      if (hasModifierCloning) {
        status.migration010_function_updated = false;
        status.warnings.push('⚠️  Migration 010 NOT applied: apply_template_to_dish still clones modifiers');
      } else {
        status.migration010_function_updated = true;
      }
    } else {
      status.warnings.push('⚠️  apply_template_to_dish function not found');
    }

    // Determine overall readiness
    status.overall_ready = 
      status.library_template_id_column_exists &&
      status.migration009_course_id_nullable &&
      status.migration010_function_updated;

    return status;
  } catch (error: any) {
    status.warnings.push(`❌ Error checking migrations: ${error.message}`);
    return status;
  } finally {
    await pool.end();
  }
}

/**
 * Print migration status to console
 */
export async function printMigrationStatus(): Promise<void> {
  console.log('\n========================================');
  console.log('Library Linking Migration Status Check');
  console.log('========================================\n');

  const status = await checkLibraryLinkingMigrations();

  console.log('Migration 009 (Global Library Schema):');
  console.log(`  ✓ library_template_id column: ${status.library_template_id_column_exists ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`  ✓ course_id nullable: ${status.migration009_course_id_nullable ? '✅ YES' : '❌ NO'}`);
  console.log('');
  
  console.log('Migration 010 (Fix Library Linking):');
  console.log(`  ✓ apply_template_to_dish updated: ${status.migration010_function_updated ? '✅ YES' : '❌ NO (still cloning)'}`);
  console.log('');

  if (status.warnings.length > 0) {
    console.log('Warnings:');
    status.warnings.forEach(warning => console.log(`  ${warning}`));
    console.log('');
  }

  console.log('========================================');
  console.log(`Overall Status: ${status.overall_ready ? '✅ READY' : '❌ NOT READY'}`);
  console.log('========================================\n');

  if (!status.overall_ready) {
    console.log('Required Actions:');
    if (!status.library_template_id_column_exists || !status.migration009_course_id_nullable) {
      console.log('  1. Run migration 009: psql -h <host> -d <db> -f migrations/009_global_modifier_library.sql');
    }
    if (!status.migration010_function_updated) {
      console.log('  2. Run migration 010: psql -h <host> -d <db> -f migrations/010_fix_library_linking.sql');
    }
    console.log('');
  } else {
    console.log('Next Steps:');
    console.log('  1. Run migration script to clean up cloned modifiers');
    console.log('     npm run migrate:library-linking -- --dry-run');
    console.log('  2. After reviewing dry run, execute migration:');
    console.log('     npm run migrate:library-linking -- --confirm');
    console.log('');
  }
}

/**
 * Check if there are any dishes with mixed state (both library link and cloned modifiers)
 */
export async function checkMixedState(): Promise<{
  count: number;
  samples: Array<{
    dish_id: number;
    group_id: number;
    course_template_id: number;
    cloned_modifiers: number;
  }>;
}> {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_BRANCH_DB_URL,
  });

  try {
    const mixedStateQuery = `
      SELECT 
        dmg.dish_id,
        dmg.id as group_id,
        dmg.course_template_id,
        COUNT(dm.id) as cloned_modifiers
      FROM menuca_v3.dish_modifier_groups dmg
      INNER JOIN menuca_v3.dish_modifiers dm ON dm.modifier_group_id = dmg.id
      WHERE dmg.course_template_id IS NOT NULL
      AND dmg.deleted_at IS NULL
      AND dm.deleted_at IS NULL
      GROUP BY dmg.dish_id, dmg.id, dmg.course_template_id
      HAVING COUNT(dm.id) > 0
      LIMIT 10;
    `;
    
    const { rows } = await pool.query(mixedStateQuery);
    
    const countQuery = `
      SELECT COUNT(DISTINCT dmg.id) as total
      FROM menuca_v3.dish_modifier_groups dmg
      INNER JOIN menuca_v3.dish_modifiers dm ON dm.modifier_group_id = dmg.id
      WHERE dmg.course_template_id IS NOT NULL
      AND dmg.deleted_at IS NULL
      AND dm.deleted_at IS NULL;
    `;
    const { rows: countResult } = await pool.query(countQuery);
    
    return {
      count: parseInt(countResult[0]?.total || '0'),
      samples: rows.map(r => ({
        dish_id: r.dish_id,
        group_id: r.group_id,
        course_template_id: r.course_template_id,
        cloned_modifiers: parseInt(r.cloned_modifiers)
      }))
    };
  } catch (error: any) {
    console.error('Error checking mixed state:', error.message);
    return { count: 0, samples: [] };
  } finally {
    await pool.end();
  }
}

// Allow running this script directly
if (require.main === module) {
  printMigrationStatus().then(async () => {
    console.log('\nChecking for mixed state (dishes with both library link and cloned modifiers)...\n');
    const mixedState = await checkMixedState();
    
    if (mixedState.count > 0) {
      console.log(`⚠️  Found ${mixedState.count} dish groups with mixed state (sample):`);
      mixedState.samples.forEach(sample => {
        console.log(`  - Dish ${sample.dish_id}, Group ${sample.group_id}: ${sample.cloned_modifiers} cloned modifiers`);
      });
      console.log('\nThese should be cleaned up with the migration script.');
    } else {
      console.log('✅ No mixed state detected - all dishes are clean!');
    }
    console.log('');
  }).catch(console.error);
}
