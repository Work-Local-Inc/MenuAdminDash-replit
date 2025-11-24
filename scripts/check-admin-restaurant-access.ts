import { createClient } from '@supabase/supabase-js'

async function checkAdminRestaurantAccess() {
  const publicSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'public' } }
  )

  console.log('🔍 Checking admin_user_restaurants table...\n')

  // Check total records
  const { count } = await publicSupabase
    .from('admin_user_restaurants')
    .select('*', { count: 'exact', head: true })

  console.log(`Total mappings in admin_user_restaurants: ${count}`)

  // Check for restaurant 1009
  const { data: rest1009, error } = await publicSupabase
    .from('admin_user_restaurants')
    .select('*')
    .eq('restaurant_id', 1009)

  console.log(`\nRestaurant 1009 access records: ${rest1009?.length || 0}`)
  if (rest1009 && rest1009.length > 0) {
    console.log('Sample:', rest1009[0])
  }

  // Get sample records
  const { data: sample } = await publicSupabase
    .from('admin_user_restaurants')
    .select('*')
    .limit(5)

  console.log(`\nSample admin_user_restaurants records:`)
  sample?.forEach(r => console.log(`  Admin ${r.admin_user_id} → Restaurant ${r.restaurant_id}`))
}

checkAdminRestaurantAccess()
