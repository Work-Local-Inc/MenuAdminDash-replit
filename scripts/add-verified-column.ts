/**
 * Migration script to add 'verified' column to restaurants table
 * Run with: npx tsx scripts/add-verified-column.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'menuca_v3' },
  auth: { persistSession: false }
});

const verifiedRestaurantIds = [
  816, 502, 376, 160, 119, 105, 245, 8, 133, 
  269, 234, 87, 491, 846, 845, 607, 1009
];

async function setupVerifiedColumn() {
  console.log('🔍 Checking if verified column exists...');
  
  try {
    // Test if column exists by trying to query it
    const { error: testError } = await supabase
      .from('restaurants')
      .select('verified')
      .limit(1);

    if (testError && testError.message.includes('does not exist')) {
      console.log('\n⚠️  Column "verified" does not exist yet.');
      console.log('\n📝 Please run this SQL in Supabase SQL Editor:');
      console.log('=' .repeat(60));
      console.log('ALTER TABLE menuca_v3.restaurants');
      console.log('ADD COLUMN verified boolean DEFAULT false;');
      console.log('=' .repeat(60));
      console.log('\nAfter running the SQL, run this script again.\n');
      process.exit(1);
    } else if (testError) {
      console.error('❌ Unexpected error:', testError);
      process.exit(1);
    }

    console.log('✅ Column exists!\n');

    // Update the verified restaurants
    console.log(`🔄 Setting verified=true for ${verifiedRestaurantIds.length} restaurants...`);
    
    const { data, error: updateError, count } = await supabase
      .from('restaurants')
      .update({ verified: true })
      .in('id', verifiedRestaurantIds)
      .select('id, name');

    if (updateError) {
      console.error('❌ Error updating restaurants:', updateError);
      process.exit(1);
    }

    console.log(`✅ Successfully verified ${data?.length || 0} restaurants!\n`);
    
    // Show which restaurants were updated
    if (data && data.length > 0) {
      console.log('📋 Updated restaurants:');
      data.forEach((r: any) => console.log(`   - ${r.name} (ID: ${r.id})`));
    }
    
    // Verify the changes
    const { count: totalVerified } = await supabase
      .from('restaurants')
      .select('id', { count: 'exact', head: true })
      .eq('verified', true);

    console.log(`\n✨ Total verified restaurants in database: ${totalVerified}\n`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

setupVerifiedColumn();
