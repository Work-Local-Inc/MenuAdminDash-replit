import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createAdminClient } from '@/lib/supabase/admin'
export const dynamic = 'force-dynamic'

const SUPER_ADMIN_ROLE_ID = 1

export async function GET(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)

    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate, endDate' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    let query = (supabase as any)
      .from('statement_adjustments')
      .select('*')
      .gte('applies_to_week_start', startDate)
      .lte('applies_to_week_start', endDate)
      .order('created_at', { ascending: false })

    if (restaurantId) {
      const id = parseInt(restaurantId)
      if (isNaN(id)) {
        return NextResponse.json(
          { error: 'Invalid restaurant ID' },
          { status: 400 }
        )
      }
      query = query.eq('restaurant_id', id)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Adjustments] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch adjustments' },
        { status: 500 }
      )
    }

    const adjustments = (data || []).map((adj: any) => ({
      ...adj,
      amount: Math.round(parseFloat(adj.amount) * 100) / 100,
    }))

    return NextResponse.json(adjustments)
  } catch (error) {
    console.error('[Adjustments] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)

    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      restaurant_id,
      adjustment_type,
      category,
      description,
      amount,
      tax_exempt,
      applies_to_week_start,
      applies_to_week_end,
      recurring,
    } = body

    if (!restaurant_id || !adjustment_type || !category || amount === undefined || amount === null || !applies_to_week_start) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurant_id, adjustment_type, category, amount, applies_to_week_start' },
        { status: 400 }
      )
    }

    const validTypes = ['credit', 'charge']
    if (!validTypes.includes(adjustment_type)) {
      return NextResponse.json(
        { error: `Invalid adjustment_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const validCategories = ['refund', 'domain_renewal', 'fixed_weekly_deduction', 'mazen_donation', 'advance_deduction', 'other']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return NextResponse.json(
        { error: 'Amount must be a valid non-negative number' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await (supabase as any)
      .from('statement_adjustments')
      .insert({
        restaurant_id: parseInt(restaurant_id),
        adjustment_type,
        category,
        description: description || null,
        amount: Math.round(parsedAmount * 100) / 100,
        tax_exempt: tax_exempt !== undefined ? tax_exempt : true,
        applies_to_week_start,
        applies_to_week_end: applies_to_week_end || null,
        recurring: recurring || false,
        created_by: adminUser.id,
      })
      .select()
      .single()

    if (error) {
      console.error('[Adjustments] Insert error:', error)
      return NextResponse.json(
        { error: 'Failed to create adjustment' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[Adjustments] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)

    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    const adjustmentId = parseInt(id)
    if (isNaN(adjustmentId)) {
      return NextResponse.json(
        { error: 'Invalid adjustment ID' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { error } = await (supabase as any)
      .from('statement_adjustments')
      .delete()
      .eq('id', adjustmentId)

    if (error) {
      console.error('[Adjustments] Delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete adjustment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Adjustment deleted successfully' })
  } catch (error) {
    console.error('[Adjustments] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
