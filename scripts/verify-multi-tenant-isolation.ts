import { createAdminClient } from '../lib/supabase/admin'

async function verifyMultiTenantIsolation() {
  const supabase = createAdminClient()

  console.log('🔒 MULTI-TENANT ISOLATION VERIFICATION\n')

  // Get 2 different restaurants
  const { data: restaurants } = await supabase
    .schema('menuca_v3')
    .from('restaurants')
    .select('id, name')
    .limit(2)

  if (!restaurants || restaurants.length < 2) {
    console.log('⚠️  Need at least 2 restaurants to test isolation')
    return
  }

  const [rest1, rest2] = restaurants

  console.log(`Testing with:`)
  console.log(`  - Restaurant 1: ${rest1.name} (ID: ${rest1.id})`)
  console.log(`  - Restaurant 2: ${rest2.name} (ID: ${rest2.id})\n`)

  // Query modifier groups for restaurant 1
  const { data: groups1 } = await supabase
    .schema('menuca_v3')
    .from('course_modifier_templates')
    .select(`
      id,
      name,
      course_id,
      courses!inner (restaurant_id)
    `)
    .not('course_id', 'is', null)
    .is('deleted_at', null)
    .eq('courses.restaurant_id', rest1.id)
    .limit(10)

  // Query modifier groups for restaurant 2
  const { data: groups2 } = await supabase
    .schema('menuca_v3')
    .from('course_modifier_templates')
    .select(`
      id,
      name,
      course_id,
      courses!inner (restaurant_id)
    `)
    .not('course_id', 'is', null)
    .is('deleted_at', null)
    .eq('courses.restaurant_id', rest2.id)
    .limit(10)

  console.log(`Restaurant 1 (${rest1.name}):`)
  console.log(`  - Found ${groups1?.length || 0} modifier groups`)
  if (groups1 && groups1.length > 0) {
    console.log(`  - Sample: "${groups1[0].name}" (ID: ${groups1[0].id})`)
  }

  console.log(`\nRestaurant 2 (${rest2.name}):`)
  console.log(`  - Found ${groups2?.length || 0} modifier groups`)
  if (groups2 && groups2.length > 0) {
    console.log(`  - Sample: "${groups2[0].name}" (ID: ${groups2[0].id})`)
  }

  // Check for overlap (should be ZERO)
  const ids1 = new Set((groups1 || []).map(g => g.id))
  const ids2 = new Set((groups2 || []).map(g => g.id))
  const overlap = [...ids1].filter(id => ids2.has(id))

  console.log(`\n🔍 Cross-Tenant Check:`)
  if (overlap.length === 0) {
    console.log(`  ✅ PASSED - No modifier groups shared between restaurants`)
    console.log(`  ✅ Multi-tenant isolation is working correctly!`)
  } else {
    console.log(`  ❌ FAILED - Found ${overlap.length} shared groups:`, overlap)
    console.log(`  ❌ Multi-tenant isolation is BROKEN!`)
  }
}

verifyMultiTenantIsolation()
