import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  db: { schema: 'menuca_v3' }
});

console.log('🔍 Inspecting menuca_v3 modifier tables...\n');

// Check modifier_groups structure
const { data: modGroupCols, error: mgError } = await supabase
  .rpc('exec_sql', {
    query: `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'menuca_v3' AND table_name = 'modifier_groups'
      ORDER BY ordinal_position
    `
  });

if (mgError) {
  console.log('❌ Error fetching modifier_groups columns:', mgError.message);
  console.log('Trying direct query...\n');
  
  // Try direct query instead
  const { data: groups, error: groupError } = await supabase
    .from('modifier_groups')
    .select('*')
    .limit(1);
  
  if (groupError) {
    console.log('❌ modifier_groups query error:', groupError.message);
  } else {
    console.log('✅ modifier_groups table exists!');
    if (groups && groups.length > 0) {
      console.log('   Sample columns:', Object.keys(groups[0]).join(', '));
      console.log('   Sample data:', JSON.stringify(groups[0], null, 2));
    } else {
      console.log('   No data found in table');
    }
  }
} else {
  console.log('📋 modifier_groups columns:');
  modGroupCols?.forEach(col => {
    console.log(`   - ${col.column_name} (${col.data_type}${col.is_nullable === 'YES' ? ', nullable' : ''})`);
  });
}

console.log('');

// Check for linking tables
const { data: tables, error: tablesError } = await supabase
  .rpc('exec_sql', {
    query: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'menuca_v3'
        AND table_name LIKE '%modifier%'
      ORDER BY table_name
    `
  });

if (tablesError) {
  console.log('❌ Error fetching tables:', tablesError.message);
} else {
  console.log('📦 All modifier-related tables in menuca_v3:');
  tables?.forEach(t => console.log(`   - ${t.table_name}`));
}

console.log('\n✅ Inspection complete!');
