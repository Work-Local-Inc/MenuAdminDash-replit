import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { AuthError } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request)
    const supabase = createAdminClient()

    const templateId = parseInt(params.id)
    if (isNaN(templateId)) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      )
    }

    const { data: existingGroups } = await supabase
      .from('dish_modifier_groups')
      .select('id, is_custom')
      .eq('course_template_id', templateId)
      .is('deleted_at', null)

    const { error: templateError } = await supabase
      .from('course_modifier_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', templateId)

    if (templateError) throw templateError

    if (existingGroups && existingGroups.length > 0) {
      const groupsToOrphan = existingGroups.filter(g => !g.is_custom)
      
      if (groupsToOrphan.length > 0) {
        await supabase
          .from('dish_modifier_groups')
          .update({ 
            course_template_id: null,
            is_custom: true 
          })
          .in('id', groupsToOrphan.map(g => g.id))
      }
    }

    return NextResponse.json({
      success: true,
      orphaned_groups: existingGroups?.filter(g => !g.is_custom).length || 0,
    })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete template' },
      { status: 500 }
    )
  }
}
