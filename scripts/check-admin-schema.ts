import { createClient } from '@supabase/supabase-js'

async function checkSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'menuca_v3' } }
  )

  // Check admin_users structure
  const { data: adminUsers, error: adminError } = await supabase
    .from('admin_users')
    .select('*')
    .limit(1)

  console.log('admin_users structure:', adminUsers ? Object.keys(adminUsers[0] || {}) : 'no data')
  console.log('admin_users error:', adminError?.message || 'none')

  // Check if there's a link to auth.users
  const { data: authUsers, error: authError } = await supabase.auth.getUser()
  console.log('\nCurrent auth user:', authUsers?.user?.email || 'not authenticated')

  // Check admin_user_restaurants
  const { data: adminRest, error: restError } = await supabase
    .from('admin_user_restaurants')
    .select('*')
    .limit(1)
  
  console.log('\nadmin_user_restaurants structure:', adminRest ? Object.keys(adminRest[0] || {}) : 'no data')
}

checkSchema()
