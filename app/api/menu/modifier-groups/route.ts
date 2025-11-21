import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()
    
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')
    
    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      )
    }

    const { data: courses, error: coursesError } = await (supabase
      .schema('menuca_v3')
      .from('courses' as any)
      .select('id, name')
      .eq('restaurant_id', parseInt(restaurantId))
      .is('deleted_at', null)
      .order('display_order', { ascending: true }) as any)

    if (coursesError) throw coursesError
    
    const courseIds = (courses as any[])?.map((c: any) => c.id) || []
    
    if (courseIds.length === 0) {
      return NextResponse.json([])
    }

    const { data: templates, error: templatesError } = await (supabase
      .schema('menuca_v3')
      .from('course_modifier_templates' as any)
      .select(`
        id,
        course_id,
        name,
        is_required,
        min_selections,
        max_selections,
        display_order,
        course_template_modifiers (
          id,
          name,
          price,
          is_included,
          display_order,
          deleted_at
        )
      `)
      .in('course_id', courseIds)
      .is('deleted_at', null)
      .order('display_order', { ascending: true }) as any)

    if (templatesError) throw templatesError

    const coursesMap = new Map((courses as any[])?.map((c: any) => [c.id, c.name]))

    const result = (templates as any[] || []).map((template: any) => ({
      ...template,
      course_name: coursesMap.get(template.course_id) || 'Unknown',
      modifiers: (template.course_template_modifiers || [])
        .filter((m: any) => !m.deleted_at)
        .sort((a: any, b: any) => a.display_order - b.display_order)
        .map((m: any) => ({
          id: m.id,
          name: m.name,
          price: m.price,
          is_included: m.is_included,
          display_order: m.display_order,
        }))
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[MODIFIER GROUPS ERROR]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch modifier groups' },
      { status: 500 }
    )
  }
}
