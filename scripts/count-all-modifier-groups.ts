import { createAdminClient } from '../lib/supabase/admin'

async function countAllModifierGroups() {
  const supabase = createAdminClient()

  console.log('Counting modifier groups in course_modifier_templates...\n')

  // Count all records with course_id (including deleted)
  const { count: totalWithCourseId, error: e1 } = await supabase
    .schema('menuca_v3')
    .from('course_modifier_templates')
    .select('*', { count: 'exact', head: true })
    .not('course_id', 'is', null)

  // Count active records only (deleted_at IS NULL)
  const { count: activeWithCourseId, error: e2 } = await supabase
    .schema('menuca_v3')
    .from('course_modifier_templates')
    .select('*', { count: 'exact', head: true })
    .not('course_id', 'is', null)
    .is('deleted_at', null)

  // Count global library groups (course_id IS NULL)
  const { count: globalGroups, error: e3 } = await supabase
    .schema('menuca_v3')
    .from('course_modifier_templates')
    .select('*', { count: 'exact', head: true })
    .is('course_id', null)
    .is('deleted_at', null)

  if (e1 || e2 || e3) {
    console.error('Query failed:', e1 || e2 || e3)
    process.exit(1)
  }

  console.log('Results:')
  console.log(`  Total with course_id (all): ${totalWithCourseId}`)
  console.log(`  Active with course_id (deleted_at IS NULL): ${activeWithCourseId}`)
  console.log(`  Global library groups (course_id IS NULL): ${globalGroups}`)
  console.log(`\n✅ API should return: ${activeWithCourseId} groups`)
}

countAllModifierGroups()
