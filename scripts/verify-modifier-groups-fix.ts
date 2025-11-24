import { createAdminClient } from '../lib/supabase/admin'

async function verifyModifierGroupsFix() {
  const supabase = createAdminClient()

  console.log('Testing modifier groups API fix...\n')

  // Test the EXACT query the API uses
  const { data: templates, error } = await supabase
    .schema('menuca_v3')
    .from('course_modifier_templates')
    .select(`
      id,
      name,
      course_id,
      is_required,
      min_selections,
      max_selections,
      display_order,
      created_at,
      course_template_modifiers (
        id,
        name,
        price,
        is_included,
        display_order,
        deleted_at
      )
    `)
    .not('course_id', 'is', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(0, 2000)

  if (error) {
    console.error('❌ Query failed:', error)
    process.exit(1)
  }

  const result = (templates || []).map((template: any) => ({
    ...template,
    modifiers: (template.course_template_modifiers || [])
      .filter((m: any) => !m.deleted_at)
      .sort((a: any, b: any) => a.display_order - b.display_order)
  }))

  console.log(`✅ Query returned ${result.length} category-level modifier groups`)
  console.log('\nSample groups:')
  result.slice(0, 5).forEach((group: any) => {
    console.log(`  - ID ${group.id}: "${group.name}" (course_id: ${group.course_id}, ${group.modifiers?.length || 0} modifiers)`)
  })

  if (result.length === 1257) {
    console.log('\n🎉 SUCCESS: API returns all 1,257 groups as expected!')
  } else {
    console.log(`\n⚠️  WARNING: Expected 1,257 groups, got ${result.length}`)
  }
}

verifyModifierGroupsFix()
