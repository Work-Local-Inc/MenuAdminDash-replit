import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase-database'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function testConnection() {
  console.log('🔍 Testing Supabase connection...')
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  
  try {
    // Test: Count restaurants
    const { data: restaurants, error: restError } = await supabase
      .from('restaurants')
      .select('id, name, status', { count: 'exact', head: false })
      .limit(5)
    
    if (restError) {
      console.error('❌ Error fetching restaurants:', restError.message)
      return
    }
    
    console.log(`✅ Successfully connected! Found restaurants in database`)
    console.log(`📊 Sample restaurants:`, restaurants?.map(r => `${r.id}: ${r.name} (${r.status})`))
    
    // Test: Count users
    const { count: userCount, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    if (userError) {
      console.error('❌ Error counting users:', userError.message)
      return
    }
    
    console.log(`✅ Total users in database: ${userCount}`)
    
    // Test: Count dishes
    const { count: dishCount, error: dishError } = await supabase
      .from('dishes')
      .select('*', { count: 'exact', head: true })
    
    if (dishError) {
      console.error('❌ Error counting dishes:', dishError.message)
      return
    }
    
    console.log(`✅ Total dishes in database: ${dishCount}`)
    
    console.log('\n🎉 Database connection verified successfully!')
    console.log('📋 Ready to build the admin dashboard!')
    
  } catch (error) {
    console.error('❌ Connection test failed:', error)
  }
}

testConnection()
