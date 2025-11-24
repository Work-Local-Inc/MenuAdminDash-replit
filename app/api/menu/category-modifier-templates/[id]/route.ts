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

    // Fetch existing dish groups that inherit from this template
    const { data: existingGroups } = await (supabase
      .schema('menuca_v3')
      .from('modifier_groups' as any)
      .select('id, is_custom')
      .eq('course_template_id', templateId)
      .is('deleted_at', null) as any)

    // Soft-delete the category template
    const { error: templateError } = await (supabase
      .schema('menuca_v3')
      .from('course_modifier_templates' as any)
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', templateId) as any)

    if (templateError) throw templateError

    // Orphan dish modifier groups (convert inherited groups to custom groups)
    if (existingGroups && (existingGroups as any[]).length > 0) {
      const groupsToOrphan = (existingGroups as any[]).filter((g: any) => !g.is_custom)
      
      if (groupsToOrphan.length > 0) {
        await (supabase
          .schema('menuca_v3')
          .from('modifier_groups' as any)
          .update({ 
            course_template_id: null,
            is_custom: true 
          } as any)
          .in('id', groupsToOrphan.map((g: any) => g.id)) as any)
      }
    }

    return NextResponse.json({
      success: true,
      orphaned_groups: (existingGroups as any[])?.filter((g: any) => !g.is_custom).length || 0,
    })
  } catch (error: any) {
    console.error('[DELETE CATEGORY TEMPLATE ERROR]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete template' },
      { status: 500 }
    )
  }
}
