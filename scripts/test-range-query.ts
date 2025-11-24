import { createAdminClient } from '../lib/supabase/admin'

async function testRangeQuery() {
  const supabase = createAdminClient()

  console.log('Testing range query...\n')

  // Test 1: Get count
  const { count, error: countError } = await supabase
    .schema('menuca_v3')
    .from('course_modifier_templates')
    .select('*', { count: 'exact', head: true })
    .not('course_id', 'is', null)
    .is('deleted_at', null)

  console.log(`Total count in DB: ${count}`)

  // Test 2: Fetch with range 0-2000
  const { data: withRange, error: rangeError } = await supabase
    .schema('menuca_v3')
    .from('course_modifier_templates')
    .select('id, name')
    .not('course_id', 'is', null)
    .is('deleted_at', null)
    .range(0, 2000)

  console.log(`Fetched with .range(0, 2000): ${withRange?.length || 0} rows`)

  // Test 3: Fetch with limit
  const { data: withLimit, error: limitError } = await supabase
    .schema('menuca_v3')
    .from('course_modifier_templates')
    .select('id, name')
    .not('course_id', 'is', null)
    .is('deleted_at', null)
    .limit(2000)

  console.log(`Fetched with .limit(2000): ${withLimit?.length || 0} rows`)

  // Test 4: No range or limit
  const { data: noLimit, error: noLimitError } = await supabase
    .schema('menuca_v3')
    .from('course_modifier_templates')
    .select('id, name')
    .not('course_id', 'is', null)
    .is('deleted_at', null)

  console.log(`Fetched with no limit: ${noLimit?.length || 0} rows`)
}

testRangeQuery()
