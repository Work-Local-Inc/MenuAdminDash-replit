import { createAdminClient } from '../lib/supabase/admin'

async function finalVerification() {
  const supabase = createAdminClient()

  console.log('🔍 FINAL VERIFICATION - Paginated Fetch Test\n')

  // Implement the EXACT same pagination logic as the API
  const PAGE_SIZE = 1000
  let allTemplates: any[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const start = page * PAGE_SIZE
    const end = start + PAGE_SIZE - 1

    const { data: templates, error } = await supabase
      .schema('menuca_v3')
      .from('course_modifier_templates')
      .select(`
        id,
        name,
        course_id,
        is_required,
        course_template_modifiers (
          id,
          name,
          price,
          deleted_at
        )
      `)
      .not('course_id', 'is', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(start, end)

    if (error) {
      console.error('❌ Query failed:', error)
      process.exit(1)
    }

    console.log(`  Page ${page + 1}: Fetched ${templates?.length || 0} groups (range ${start}-${end})`)
    allTemplates = allTemplates.concat(templates || [])
    hasMore = templates && templates.length === PAGE_SIZE
    page++
  }

  const result = (allTemplates || []).map((template: any) => ({
    ...template,
    modifiers: (template.course_template_modifiers || [])
      .filter((m: any) => !m.deleted_at)
  }))

  console.log(`\n✅ Total groups fetched: ${result.length}`)
  console.log(`📄 Pages fetched: ${page}`)
  
  if (result.length === 1257) {
    console.log('\n🎉 SUCCESS! API will return all 1,257 groups')
    console.log('✅ Dropdown will be populated with all modifier groups')
  } else {
    console.log(`\n⚠️  Got ${result.length} groups (expected 1,257)`)
  }

  console.log('\nSample groups:')
  result.slice(0, 3).forEach((group: any) => {
    console.log(`  - ID ${group.id}: "${group.name}" (course_id: ${group.course_id}, ${group.modifiers?.length || 0} modifiers)`)
  })
}

finalVerification()
