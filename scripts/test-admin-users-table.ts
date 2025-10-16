import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAdminUsersTable() {
  console.log('Testing admin_users table in Supabase...\n')
  
  // Try to query the table
  const { data, error, count } = await supabase
    .from('admin_users')
    .select('*', { count: 'exact', head: true })
  
  if (error) {
    console.error('❌ Error querying admin_users:', error.message)
    console.error('Code:', error.code)
    console.error('Details:', error.details)
    console.error('Hint:', error.hint)
  } else {
    console.log('✅ admin_users table exists!')
    console.log('Count:', count)
  }
}

testAdminUsersTable()
