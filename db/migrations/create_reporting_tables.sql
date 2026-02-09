-- Reporting System Tables for Menu.ca Accounting
-- Run this in Supabase SQL Editor

-- 1. Statement Adjustments (credits/charges for restaurant statements)
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

-- 2. Commission Weekly Snapshots (carry-over balances)
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

-- 3. Vendor Configs
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

-- 4. Vendor Restaurant Assignments
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

-- 5. Vendor Invoices
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

-- 6. Restaurant Ownership Groups
CREATE TABLE IF NOT EXISTS restaurant_ownership_groups (
  id SERIAL PRIMARY KEY,
  group_name VARCHAR(200) NOT NULL,
  owner_name VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Restaurant Group Memberships
CREATE TABLE IF NOT EXISTS restaurant_group_memberships (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES restaurant_ownership_groups(id) ON DELETE CASCADE,
  restaurant_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, restaurant_id)
);

-- Seed default vendor configs
INSERT INTO vendor_configs (vendor_name, vendor_code, company_name, hst_number, tax_rate, payment_terms, notes) VALUES
  ('Menu Ottawa', 'menu_ottawa', '6743757 Canada Inc', NULL, 13.00, 'Net 15', 'Darrell Corp - save PDF to shared Google Drive'),
  ('Shared Inc', 'shared_inc', 'Shared Inc', NULL, 13.00, 'Net 15', 'Internal handling'),
  ('Mazen/Milano', 'mazen_milano', '9059741 Canada Inc', NULL, 0.00, 'Net 15', 'No tax on invoice. $5k advance at start of month.'),
  ('All Out Burger', 'all_out_burger', 'All Out Burger', NULL, 13.00, 'Quarterly', 'Pay quarterly, still run/record monthly invoices')
ON CONFLICT (vendor_code) DO NOTHING;
