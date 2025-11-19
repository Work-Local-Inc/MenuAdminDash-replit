import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testInsert() {
  console.log('Testing admin_users INSERT...\n')
  
  const password_hash = await bcrypt.hash('TestPassword123!', 10)
  
  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      email: `test.${Date.now()}@menu.ca`,
      first_name: 'Test',
      last_name: 'Admin',
      password_hash,
      mfa_enabled: false,
    } as any)
    .select()
  
  if (error) {
    console.error('❌ INSERT failed:', error.message)
    console.error('Code:', error.code)
    console.error('Details:', error.details)
    console.error('Hint:', error.hint)
    
    if (error.code === '42501') {
      console.log('\n💡 This is a permissions error - likely RLS policies')
      console.log('Solution: Disable RLS for admin_users table or add proper policies')
    }
  } else {
    console.log('✅ INSERT successful!', data)
  }
}

testInsert()
