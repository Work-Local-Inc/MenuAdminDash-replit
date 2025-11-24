import { Pool } from 'pg';

interface MigrationStats {
  templatesProcessed: number;
  dishGroupsProcessed: number;
  modifiersDeleted: number;
  errors: Array<{ dish_id: number; error: string }>;
}

async function migrateToLibraryLinking() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_BRANCH_DB_URL,
  });

  const stats: MigrationStats = {
    templatesProcessed: 0,
    dishGroupsProcessed: 0,
    modifiersDeleted: 0,
    errors: []
  };

  try {
    console.log('========================================');
    console.log('Library Linking Migration Script');
    console.log('========================================');
    console.log('Purpose: Remove cloned modifiers that should reference library groups\n');

    // Step 1: Find all category associations (templates with library_template_id)
    console.log('[STEP 1] Finding category templates linked to library groups...');
    const associationsQuery = `
      SELECT id, course_id, library_template_id, name
      FROM menuca_v3.course_modifier_templates
      WHERE library_template_id IS NOT NULL
      AND deleted_at IS NULL
      ORDER BY id;
    `;
    const { rows: associations } = await pool.query(associationsQuery);
    console.log(`Found ${associations.length} category templates linked to library groups\n`);

    if (associations.length === 0) {
      console.log('No library associations found. Nothing to migrate.');
      await pool.end();
      return;
    }

    // Step 2: For each association, find dishes that inherited from it
    console.log('[STEP 2] Processing each category template...\n');
    
    for (const assoc of associations) {
      stats.templatesProcessed++;
      console.log(`\nProcessing template: "${assoc.name}" (ID: ${assoc.id})`);
      console.log(`  - Category ID: ${assoc.course_id}`);
      console.log(`  - Library Template ID: ${assoc.library_template_id}`);

      // Find dish modifier groups that reference this template
      const dishGroupsQuery = `
        SELECT id, dish_id, name
        FROM menuca_v3.modifier_groups
        WHERE course_template_id = $1
        AND deleted_at IS NULL
        ORDER BY dish_id;
      `;
      const { rows: dishGroups } = await pool.query(dishGroupsQuery, [assoc.id]);
      
      console.log(`  - Found ${dishGroups.length} dish groups inheriting from this template`);

      if (dishGroups.length === 0) {
        console.log('  - No dishes to migrate, skipping...');
        continue;
      }

      // Step 3: For each dish group, delete cloned modifiers
      for (const group of dishGroups) {
        stats.dishGroupsProcessed++;

        // First, check if there are any modifiers to delete
        const checkModifiersQuery = `
          SELECT COUNT(*) as count
          FROM menuca_v3.dish_modifiers
          WHERE modifier_group_id = $1;
        `;
        const { rows: checkResult } = await pool.query(checkModifiersQuery, [group.id]);
        const modifierCount = parseInt(checkResult[0].count);

        if (modifierCount === 0) {
          console.log(`    ✓ Dish ${group.dish_id} / Group "${group.name}" (ID: ${group.id}) - already clean`);
          continue;
        }

        try {
          // Delete cloned modifiers (they should come from library now)
          const deleteQuery = `
            DELETE FROM menuca_v3.dish_modifiers
            WHERE modifier_group_id = $1
            RETURNING id;
          `;
          const { rows: deletedModifiers } = await pool.query(deleteQuery, [group.id]);
          
          stats.modifiersDeleted += deletedModifiers.length;
          console.log(`    ✓ Dish ${group.dish_id} / Group "${group.name}" (ID: ${group.id}) - Deleted ${deletedModifiers.length} cloned modifiers`);
        } catch (error: any) {
          console.error(`    ✗ ERROR on Dish ${group.dish_id} / Group ${group.id}:`, error.message);
          stats.errors.push({
            dish_id: group.dish_id,
            error: error.message
          });
        }
      }
    }

    // Step 4: Verification - find orphaned modifiers (dish_modifiers without valid group reference)
    console.log('\n[STEP 3] Checking for orphaned modifiers...');
    const orphanedQuery = `
      SELECT dm.id, dm.modifier_group_id, dm.name
      FROM menuca_v3.dish_modifiers dm
      LEFT JOIN menuca_v3.modifier_groups dmg ON dm.modifier_group_id = dmg.id
      WHERE dmg.id IS NULL
      OR dmg.deleted_at IS NOT NULL
      LIMIT 10;
    `;
    const { rows: orphanedModifiers } = await pool.query(orphanedQuery);
    
    if (orphanedModifiers.length > 0) {
      console.log(`⚠️  Found ${orphanedModifiers.length} orphaned modifiers (sample):`);
      orphanedModifiers.forEach((mod: any) => {
        console.log(`  - Modifier ID ${mod.id}: "${mod.name}" (Group ${mod.modifier_group_id})`);
      });
      console.log('  These may need manual cleanup.');
    } else {
      console.log('✓ No orphaned modifiers found');
    }

    // Step 5: Print summary
    console.log('\n========================================');
    console.log('Migration Summary');
    console.log('========================================');
    console.log(`Category templates processed: ${stats.templatesProcessed}`);
    console.log(`Dish groups processed: ${stats.dishGroupsProcessed}`);
    console.log(`Cloned modifiers deleted: ${stats.modifiersDeleted}`);
    console.log(`Errors encountered: ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.log('\nErrors:');
      stats.errors.forEach(err => {
        console.log(`  - Dish ${err.dish_id}: ${err.error}`);
      });
    }

    console.log('\n✅ Migration completed!');
    console.log('\nNext steps:');
    console.log('1. Verify the menu builder displays correctly');
    console.log('2. Check logs for any MIXED STATE warnings');
    console.log('3. Test that library modifier updates propagate to dishes');
    console.log('========================================\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Dry run mode - preview changes without executing
async function dryRunMigration() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_BRANCH_DB_URL,
  });

  try {
    console.log('========================================');
    console.log('DRY RUN MODE - Preview Only');
    console.log('========================================\n');

    // Find all category associations
    const associationsQuery = `
      SELECT id, course_id, library_template_id, name
      FROM menuca_v3.course_modifier_templates
      WHERE library_template_id IS NOT NULL
      AND deleted_at IS NULL
      ORDER BY id;
    `;
    const { rows: associations } = await pool.query(associationsQuery);
    
    console.log(`Found ${associations.length} category templates linked to library groups\n`);

    let totalModifiersToDelete = 0;

    for (const assoc of associations) {
      console.log(`Template: "${assoc.name}" (ID: ${assoc.id})`);
      
      const dishGroupsQuery = `
        SELECT dmg.id, dmg.dish_id, dmg.name, COUNT(dm.id) as modifier_count
        FROM menuca_v3.modifier_groups dmg
        LEFT JOIN menuca_v3.dish_modifiers dm ON dm.modifier_group_id = dmg.id
        WHERE dmg.course_template_id = $1
        AND dmg.deleted_at IS NULL
        GROUP BY dmg.id, dmg.dish_id, dmg.name
        HAVING COUNT(dm.id) > 0
        ORDER BY dmg.dish_id;
      `;
      const { rows: dishGroups } = await pool.query(dishGroupsQuery, [assoc.id]);
      
      if (dishGroups.length > 0) {
        console.log(`  Will process ${dishGroups.length} dish groups:`);
        dishGroups.forEach((group: any) => {
          const count = parseInt(group.modifier_count);
          totalModifiersToDelete += count;
          console.log(`    - Dish ${group.dish_id} / Group "${group.name}": ${count} modifiers to delete`);
        });
      } else {
        console.log('  No dish groups with cloned modifiers');
      }
      console.log('');
    }

    console.log('========================================');
    console.log(`Total modifiers that would be deleted: ${totalModifiersToDelete}`);
    console.log('========================================\n');
    console.log('To execute migration, run: npm run migrate:library-linking');
    console.log('Or: tsx scripts/migrate-to-library-linking.ts\n');

  } catch (error: any) {
    console.error('Dry run failed:', error);
  } finally {
    await pool.end();
  }
}

// Main execution
const isDryRun = process.argv.includes('--dry-run');

if (isDryRun) {
  dryRunMigration();
} else {
  const confirmed = process.argv.includes('--confirm');
  
  if (!confirmed) {
    console.log('⚠️  WARNING: This will delete cloned modifiers from the database!');
    console.log('');
    console.log('Run in dry-run mode first: npm run migrate:library-linking -- --dry-run');
    console.log('Or confirm execution: npm run migrate:library-linking -- --confirm');
    console.log('');
    process.exit(0);
  }
  
  migrateToLibraryLinking();
}
