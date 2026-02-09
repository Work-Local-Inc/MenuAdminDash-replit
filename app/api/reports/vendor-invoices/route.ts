import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { createClient } from '@/lib/supabase/server'

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
    const vendorId = searchParams.get('vendorId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = await createClient()

    let query = (supabase as any)
      .from('vendor_invoices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (vendorId) {
      query = query.eq('vendor_id', parseInt(vendorId))
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: invoices, error } = await query

    if (error) {
      console.error('[Vendor Invoices] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch vendor invoices' },
        { status: 500 }
      )
    }

    const vendorIds = Array.from(new Set((invoices || []).map((inv: any) => inv.vendor_id))) as number[]

    let vendorMap: Record<number, string> = {}
    if (vendorIds.length > 0) {
      const { data: vendors } = await (supabase as any)
        .from('vendor_configs')
        .select('id, vendor_name, company_name')
        .in('id', vendorIds)

      if (vendors) {
        for (const v of vendors) {
          vendorMap[v.id] = v.vendor_name
        }
      }
    }

    const enriched = (invoices || []).map((inv: any) => ({
      ...inv,
      vendor_name: vendorMap[inv.vendor_id] || `Vendor #${inv.vendor_id}`,
    }))

    return NextResponse.json(enriched)
  } catch (error: any) {
    console.error('[Vendor Invoices] Error:', error)
    const status = error.statusCode || 500
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
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
      vendor_id,
      invoice_date,
      period_start,
      period_end,
      line_items,
      subtotal,
      tax_rate,
      tax_amount,
      total,
    } = body

    if (!vendor_id || !invoice_date || !period_start || !period_end || !line_items) {
      return NextResponse.json(
        { error: 'Missing required fields: vendor_id, invoice_date, period_start, period_end, line_items' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: maxData, error: maxError } = await (supabase as any)
      .from('vendor_invoices')
      .select('invoice_number')
      .eq('vendor_id', vendor_id)
      .order('invoice_number', { ascending: false })
      .limit(1)

    if (maxError) {
      console.error('[Vendor Invoices] Max invoice query error:', maxError)
      return NextResponse.json(
        { error: 'Failed to generate invoice number' },
        { status: 500 }
      )
    }

    const nextInvoiceNumber = (maxData && maxData.length > 0 && maxData[0].invoice_number)
      ? maxData[0].invoice_number + 1
      : 1

    const { data: invoice, error: insertError } = await (supabase as any)
      .from('vendor_invoices')
      .insert({
        vendor_id,
        invoice_number: nextInvoiceNumber,
        invoice_date,
        period_start,
        period_end,
        line_items,
        subtotal: subtotal || 0,
        tax_rate: tax_rate || 0,
        tax_amount: tax_amount || 0,
        total: total || 0,
        status: 'draft',
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Vendor Invoices] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create invoice: ' + insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(invoice, { status: 201 })
  } catch (error: any) {
    console.error('[Vendor Invoices] POST Error:', error)
    const status = error.statusCode || 500
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)

    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, status: newStatus } = body

    if (!id || !newStatus) {
      return NextResponse.json(
        { error: 'Missing required fields: id, status' },
        { status: 400 }
      )
    }

    const validStatuses = ['draft', 'finalized', 'paid']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: existing, error: fetchError } = await (supabase as any)
      .from('vendor_invoices')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const validTransitions: Record<string, string[]> = {
      draft: ['finalized'],
      finalized: ['paid'],
      paid: [],
    }

    if (!validTransitions[existing.status]?.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${existing.status} to ${newStatus}` },
        { status: 400 }
      )
    }

    const { data: updated, error: updateError } = await (supabase as any)
      .from('vendor_invoices')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[Vendor Invoices] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invoice status' },
        { status: 500 }
      )
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('[Vendor Invoices] PUT Error:', error)
    const status = error.statusCode || 500
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status }
    )
  }
}
