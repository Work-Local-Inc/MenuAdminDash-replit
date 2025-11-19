import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function listTables() {
  console.log('Checking which tables exist in Supabase...\n')
  
  const tablesToCheck = [
    'restaurants',
    'users',
    'orders',
    'admin_users',
    'admin_user_restaurants',
    'coupons',
    'promotional_coupons'
  ]
  
  for (const table of tablesToCheck) {
    const { data, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.log(`❌ ${table}: DOES NOT EXIST (${error.code})`)
    } else {
      console.log(`✅ ${table}: EXISTS`)
    }
  }
}

listTables()
