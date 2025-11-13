#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'menuca_v3' }
});

console.log('📝 Reading SQL file...');
const sqlPath = join(__dirname, '..', 'SUPABASE_FIX_get_restaurant_menu.sql');
const sql = readFileSync(sqlPath, 'utf8');

console.log('🚀 Executing SQL function update...');

try {
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('❌ Error:', error.message);
    
    console.log('\n⚠️  Manual execution required. Please:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Paste the contents of SUPABASE_FIX_get_restaurant_menu.sql');
    console.log('3. Click "Run"');
    process.exit(1);
  }
  
  console.log('✅ SQL function updated successfully!');
  
  console.log('\n🧪 Testing menu function...');
  const { data: menuData, error: menuError } = await supabase
    .rpc('get_restaurant_menu', { p_restaurant_id: 961, p_language_code: 'en' });
  
  if (menuError) {
    console.error('❌ Menu test failed:', menuError.message);
    process.exit(1);
  }
  
  const courses = menuData.courses || [];
  const totalDishes = courses.reduce((sum, course) => sum + (course.dishes?.length || 0), 0);
  
  console.log(`✅ Menu loaded: ${courses.length} courses, ${totalDishes} dishes`);
  
  if (totalDishes > 0 && menuData.courses[0].dishes[0].base_price !== undefined) {
    const sampleDish = menuData.courses[0].dishes[0];
    console.log(`✅ Sample dish "${sampleDish.name}": $${sampleDish.base_price}`);
  } else {
    console.log('⚠️  Warning: Dishes may still be missing base_price');
  }
  
} catch (err) {
  console.error('❌ Unexpected error:', err.message);
  console.log('\n⚠️  Manual execution required. Please:');
  console.log('1. Go to Supabase Dashboard → SQL Editor');
  console.log('2. Paste the contents of SUPABASE_FIX_get_restaurant_menu.sql');
  console.log('3. Click "Run"');
  process.exit(1);
}
