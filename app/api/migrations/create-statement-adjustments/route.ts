import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
export const dynamic = 'force-dynamic'

const SUPER_ADMIN_ROLE_ID = 1

export async function POST(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)

    if ((adminUser as { role_id: number }).role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        { error: 'Super Admin access required for migrations' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient() as any

    const results: Record<string, { success: boolean; error?: string }> = {}

    const { error: adjustmentsError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS statement_adjustments (
          id SERIAL PRIMARY KEY,
          restaurant_id INTEGER NOT NULL,
          adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('credit', 'charge')),
          category VARCHAR(50) NOT NULL CHECK (category IN ('refund', 'domain_renewal', 'fixed_weekly_deduction', 'mazen_donation', 'advance_deduction', 'other')),
          description TEXT,
          amount DECIMAL(10,2) NOT NULL,
          tax_exempt BOOLEAN DEFAULT true,
          applies_to_week_start DATE NOT NULL,
          applies_to_week_end DATE,
          recurring BOOLEAN DEFAULT false,
          created_by INTEGER,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })
    results.statement_adjustments = adjustmentsError
      ? { success: false, error: adjustmentsError.message }
      : { success: true }

    const { error: snapshotsError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS commission_weekly_snapshots (
          id SERIAL PRIMARY KEY,
          restaurant_id INTEGER NOT NULL,
          week_start DATE NOT NULL,
          week_end DATE NOT NULL,
          this_week_net DECIMAL(10,2) DEFAULT 0,
          prev_week_net DECIMAL(10,2) DEFAULT 0,
          carry_value DECIMAL(10,2) DEFAULT 0,
          next_week_balance DECIMAL(10,2) DEFAULT 0,
          net_paid DECIMAL(10,2) DEFAULT 0,
          snapshot_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(restaurant_id, week_start)
        );
      `
    })
    results.commission_weekly_snapshots = snapshotsError
      ? { success: false, error: snapshotsError.message }
      : { success: true }

    const { error: vendorConfigsError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS vendor_configs (
          id SERIAL PRIMARY KEY,
          vendor_name VARCHAR(100) NOT NULL,
          vendor_code VARCHAR(50) UNIQUE NOT NULL,
          company_name VARCHAR(200),
          hst_number VARCHAR(50),
          tax_rate DECIMAL(5,2) DEFAULT 13.00,
          contact_email VARCHAR(200),
          payment_terms VARCHAR(100) DEFAULT 'Net 15',
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })
    results.vendor_configs = vendorConfigsError
      ? { success: false, error: vendorConfigsError.message }
      : { success: true }

    const { error: vendorAssignmentsError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS vendor_restaurant_assignments (
          id SERIAL PRIMARY KEY,
          vendor_id INTEGER NOT NULL REFERENCES vendor_configs(id),
          restaurant_id INTEGER NOT NULL,
          commission_rate DECIMAL(5,2) NOT NULL,
          version VARCHAR(10) DEFAULT 'v1' CHECK (version IN ('v1', 'v2')),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(vendor_id, restaurant_id, version)
        );
      `
    })
    results.vendor_restaurant_assignments = vendorAssignmentsError
      ? { success: false, error: vendorAssignmentsError.message }
      : { success: true }

    const { error: vendorInvoicesError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS vendor_invoices (
          id SERIAL PRIMARY KEY,
          vendor_id INTEGER NOT NULL REFERENCES vendor_configs(id),
          invoice_number INTEGER NOT NULL,
          invoice_date DATE NOT NULL,
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          line_items JSONB DEFAULT '[]',
          subtotal DECIMAL(10,2) NOT NULL,
          tax_rate DECIMAL(5,2) DEFAULT 13.00,
          tax_amount DECIMAL(10,2) DEFAULT 0,
          total DECIMAL(10,2) NOT NULL,
          status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'paid')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(vendor_id, invoice_number)
        );
      `
    })
    results.vendor_invoices = vendorInvoicesError
      ? { success: false, error: vendorInvoicesError.message }
      : { success: true }

    const { error: ownershipGroupsError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS restaurant_ownership_groups (
          id SERIAL PRIMARY KEY,
          group_name VARCHAR(200) NOT NULL,
          owner_name VARCHAR(200),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })
    results.restaurant_ownership_groups = ownershipGroupsError
      ? { success: false, error: ownershipGroupsError.message }
      : { success: true }

    const { error: groupMembershipsError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS restaurant_group_memberships (
          id SERIAL PRIMARY KEY,
          group_id INTEGER NOT NULL REFERENCES restaurant_ownership_groups(id) ON DELETE CASCADE,
          restaurant_id INTEGER NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(group_id, restaurant_id)
        );
      `
    })
    results.restaurant_group_memberships = groupMembershipsError
      ? { success: false, error: groupMembershipsError.message }
      : { success: true }

    const allSucceeded = Object.values(results).every(r => r.success)

    return NextResponse.json({
      success: allSucceeded,
      message: allSucceeded
        ? 'All tables created successfully'
        : 'Some tables failed to create',
      results,
    }, { status: allSucceeded ? 200 : 207 })

  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('[Migration] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}
