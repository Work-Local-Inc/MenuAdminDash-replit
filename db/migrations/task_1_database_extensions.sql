-- ============================================
-- MENU.CA V3 - DATABASE EXTENSIONS (TASK 1)
-- ============================================
-- This migration adds 11 new tables and updates existing tables
-- to support: RBAC, Franchises, Blacklist, Email Templates, etc.
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- Dashboard: https://nthpbtdjhhnwfxqsxbvy.supabase.co
-- Navigate to: SQL Editor > New Query > Paste this file > Run
--
-- Estimated time: ~30 seconds
-- ============================================

BEGIN;

-- ============================================
-- 1. ADMIN ROLES (RBAC Foundation)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_roles (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '{}'::jsonb,
  is_system_role BOOLEAN DEFAULT false, -- true for Super Admin, Restaurant Manager, Staff
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_name ON admin_roles(name);
CREATE INDEX IF NOT EXISTS idx_admin_roles_is_system_role ON admin_roles(is_system_role);

COMMENT ON TABLE admin_roles IS 'Role definitions for admin users with JSON permission matrix';
COMMENT ON COLUMN admin_roles.permissions IS 'JSON object: {"restaurants": {"create": true, "edit": true}, "users": {"view": true}}';
COMMENT ON COLUMN admin_roles.is_system_role IS 'System roles cannot be deleted (Super Admin, Restaurant Manager, Staff)';

-- Insert default system roles
INSERT INTO admin_roles (name, description, is_system_role, permissions) VALUES
  ('Super Admin', 'Full access to all features and restaurants', true, 
   '{"restaurants": {"create": true, "edit": true, "delete": true, "view": true}, 
     "users": {"create": true, "edit": true, "delete": true, "view": true}, 
     "orders": {"manage": true, "view": true}, 
     "reports": {"view": true}, 
     "settings": {"manage": true}}'::jsonb),
  ('Restaurant Manager', 'Manage assigned restaurants only', true, 
   '{"restaurants": {"edit": true, "view": true}, 
     "orders": {"manage": true, "view": true}, 
     "menu": {"edit": true}, 
     "reports": {"view": true}}'::jsonb),
  ('Staff', 'Read-only access to assigned restaurants', true, 
   '{"restaurants": {"view": true}, 
     "orders": {"view": true}, 
     "reports": {"view": true}}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. BLACKLIST (Security)
-- ============================================
CREATE TABLE IF NOT EXISTS blacklist (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  identifier_type VARCHAR(20) NOT NULL CHECK (identifier_type IN ('email', 'phone', 'ip', 'device_id')),
  identifier_value VARCHAR(255) NOT NULL,
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL = permanent ban
  created_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blacklist_identifier ON blacklist(identifier_type, identifier_value);
CREATE INDEX IF NOT EXISTS idx_blacklist_expires_at ON blacklist(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blacklist_created_at ON blacklist(created_at DESC);

COMMENT ON TABLE blacklist IS 'Blocked users/devices to prevent fraudulent orders';
COMMENT ON COLUMN blacklist.expires_at IS 'NULL = permanent ban, otherwise temporary ban until this date';

-- ============================================
-- 3. FRANCHISES (Chain/Multi-Location Management)
-- ============================================
CREATE TABLE IF NOT EXISTS franchises (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  headquarters_address TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  website_url TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_franchises_name ON franchises(name);
CREATE INDEX IF NOT EXISTS idx_franchises_is_active ON franchises(is_active);

COMMENT ON TABLE franchises IS 'Franchise/chain organizations that own multiple restaurants';

-- ============================================
-- 4. FRANCHISE COMMISSION RULES
-- ============================================
CREATE TABLE IF NOT EXISTS franchise_commission_rules (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  franchise_id INTEGER NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  commission_type VARCHAR(20) NOT NULL CHECK (commission_type IN ('percentage', 'fixed_per_order', 'tiered')),
  commission_value DECIMAL(10, 2) NOT NULL, -- percentage (e.g., 5.5) or fixed amount in cents (e.g., 200 = $2.00)
  tier_config JSONB, -- For tiered commissions: [{"min": 0, "max": 1000, "value": 5}, {"min": 1001, "max": null, "value": 3}]
  applies_to VARCHAR(20) DEFAULT 'all' CHECK (applies_to IN ('all', 'delivery', 'takeout')),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE, -- NULL = no expiration
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_franchise_commission_franchise_id ON franchise_commission_rules(franchise_id);
CREATE INDEX IF NOT EXISTS idx_franchise_commission_effective_from ON franchise_commission_rules(effective_from);
CREATE INDEX IF NOT EXISTS idx_franchise_commission_is_active ON franchise_commission_rules(is_active);

COMMENT ON TABLE franchise_commission_rules IS 'Commission calculation rules for franchise locations';
COMMENT ON COLUMN franchise_commission_rules.commission_value IS 'For percentage: 5.5 = 5.5%. For fixed: 200 = $2.00 per order';

-- ============================================
-- 5. ORDER CANCELLATION REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS order_cancellation_requests (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  requested_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL, -- Customer who requested
  reason_category VARCHAR(50) CHECK (reason_category IN ('customer_request', 'restaurant_unavailable', 'delivery_issue', 'payment_failed', 'duplicate_order', 'other')),
  reason_details TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  refund_amount INTEGER, -- Amount refunded in cents
  refund_status VARCHAR(20) CHECK (refund_status IN ('not_applicable', 'pending', 'processed', 'failed')),
  refund_transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_cancellation_order_id ON order_cancellation_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_order_cancellation_status ON order_cancellation_requests(status);
CREATE INDEX IF NOT EXISTS idx_order_cancellation_created_at ON order_cancellation_requests(created_at DESC);

COMMENT ON TABLE order_cancellation_requests IS 'Customer cancellation requests with admin approval workflow';

-- ============================================
-- 6. EMAIL TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  template_key VARCHAR(100) NOT NULL UNIQUE, -- e.g., "order_confirmation", "password_reset"
  subject VARCHAR(255) NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables JSONB DEFAULT '[]'::jsonb, -- List of available variables: ["customerName", "orderNumber", "deliveryAddress"]
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active);

COMMENT ON TABLE email_templates IS 'Customizable email templates with variable substitution';
COMMENT ON COLUMN email_templates.variables IS 'JSON array of variable names that can be used in email body: ["{{customerName}}", "{{orderTotal}}"]';

-- ============================================
-- 7. RESTAURANT CITATIONS (SEO/Local Listings)
-- ============================================
CREATE TABLE IF NOT EXISTS restaurant_citations (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  platform VARCHAR(100) NOT NULL, -- e.g., "Google My Business", "Yelp", "TripAdvisor"
  profile_url TEXT,
  claimed_date DATE,
  verification_status VARCHAR(20) CHECK (verification_status IN ('unverified', 'pending', 'verified', 'lost')),
  last_verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_citations_restaurant_id ON restaurant_citations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_citations_platform ON restaurant_citations(platform);
CREATE INDEX IF NOT EXISTS idx_restaurant_citations_verification_status ON restaurant_citations(verification_status);

COMMENT ON TABLE restaurant_citations IS 'Track restaurant listings on external platforms (Google, Yelp, etc.)';

-- ============================================
-- 8. RESTAURANT BANNERS (Promotional Banners)
-- ============================================
CREATE TABLE IF NOT EXISTS restaurant_banners (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title VARCHAR(255),
  message TEXT NOT NULL,
  banner_type VARCHAR(20) DEFAULT 'info' CHECK (banner_type IN ('info', 'warning', 'success', 'promotion')),
  background_color VARCHAR(7) DEFAULT '#3b82f6', -- Hex color
  text_color VARCHAR(7) DEFAULT '#ffffff',
  link_url TEXT,
  link_text VARCHAR(100),
  display_on VARCHAR(20) DEFAULT 'all' CHECK (display_on IN ('all', 'menu_page', 'checkout', 'homepage')),
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE, -- NULL = no expiration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_banners_restaurant_id ON restaurant_banners(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_banners_is_active ON restaurant_banners(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurant_banners_dates ON restaurant_banners(start_date, end_date);

COMMENT ON TABLE restaurant_banners IS 'Promotional/notification banners displayed on restaurant pages';

-- ============================================
-- 9. RESTAURANT BANK ACCOUNTS (Accounting)
-- ============================================
CREATE TABLE IF NOT EXISTS restaurant_bank_accounts (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  account_holder_name VARCHAR(255) NOT NULL,
  institution_number VARCHAR(10), -- Canadian: 3 digits
  transit_number VARCHAR(10), -- Canadian: 5 digits
  account_number_encrypted TEXT NOT NULL, -- Encrypted account number
  account_type VARCHAR(20) CHECK (account_type IN ('checking', 'savings', 'business')),
  currency VARCHAR(3) DEFAULT 'CAD',
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_bank_accounts_restaurant_id ON restaurant_bank_accounts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_bank_accounts_is_primary ON restaurant_bank_accounts(is_primary);

COMMENT ON TABLE restaurant_bank_accounts IS 'Bank account information for restaurant payouts (encrypted)';
COMMENT ON COLUMN restaurant_bank_accounts.account_number_encrypted IS 'Encrypted using Supabase Vault or application-level encryption';

-- ============================================
-- 10. RESTAURANT REDIRECTS (SEO 301 Redirects)
-- ============================================
CREATE TABLE IF NOT EXISTS restaurant_redirects (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  from_path VARCHAR(500) NOT NULL, -- Old URL path
  to_path VARCHAR(500) NOT NULL, -- New URL path
  redirect_type SMALLINT DEFAULT 301 CHECK (redirect_type IN (301, 302, 307)),
  is_active BOOLEAN DEFAULT true,
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_redirects_from_path ON restaurant_redirects(restaurant_id, from_path) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_restaurant_redirects_restaurant_id ON restaurant_redirects(restaurant_id);

COMMENT ON TABLE restaurant_redirects IS 'SEO 301/302 redirects for changed restaurant URLs';

-- ============================================
-- 11. RESTAURANT CHARGES (Fees & Adjustments)
-- ============================================
CREATE TABLE IF NOT EXISTS restaurant_charges (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  charge_type VARCHAR(50) NOT NULL CHECK (charge_type IN ('setup_fee', 'monthly_fee', 'commission_adjustment', 'marketing_fee', 'support_fee', 'penalty', 'credit', 'other')),
  description TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Amount in cents (can be negative for credits)
  currency VARCHAR(3) DEFAULT 'CAD',
  charged_for_period_start DATE,
  charged_for_period_end DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid', 'waived', 'cancelled')),
  invoice_number VARCHAR(50),
  payment_due_date DATE,
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_charges_restaurant_id ON restaurant_charges(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_charges_status ON restaurant_charges(status);
CREATE INDEX IF NOT EXISTS idx_restaurant_charges_charge_type ON restaurant_charges(charge_type);
CREATE INDEX IF NOT EXISTS idx_restaurant_charges_payment_due_date ON restaurant_charges(payment_due_date);

COMMENT ON TABLE restaurant_charges IS 'Fees, commissions, and adjustments charged to restaurants';

-- ============================================
-- 12. ADD COLUMNS TO EXISTING TABLES
-- ============================================

-- Add franchise_id to restaurants table
ALTER TABLE restaurants 
  ADD COLUMN IF NOT EXISTS franchise_id INTEGER REFERENCES franchises(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_franchise_id ON restaurants(franchise_id);

COMMENT ON COLUMN restaurants.franchise_id IS 'Links restaurant to parent franchise/chain (NULL = independent restaurant)';

-- Add role_id to admin_user_restaurants table (junction table for admin users assigned to restaurants)
ALTER TABLE admin_user_restaurants 
  ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES admin_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admin_user_restaurants_role_id ON admin_user_restaurants(role_id);

COMMENT ON COLUMN admin_user_restaurants.role_id IS 'Role for this admin user at this specific restaurant';

-- Add enhanced coupon fields to promotional_coupons table
ALTER TABLE promotional_coupons 
  ADD COLUMN IF NOT EXISTS email_exclusive BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS include_in_emails BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS single_use BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS applies_to_courses JSONB, -- Array of course IDs: [1, 5, 12]
  ADD COLUMN IF NOT EXISTS min_order_amount INTEGER; -- Minimum order in cents

CREATE INDEX IF NOT EXISTS idx_promotional_coupons_email_exclusive ON promotional_coupons(email_exclusive);
CREATE INDEX IF NOT EXISTS idx_promotional_coupons_single_use ON promotional_coupons(single_use);

COMMENT ON COLUMN promotional_coupons.email_exclusive IS 'True = only available via email campaigns, not publicly visible';
COMMENT ON COLUMN promotional_coupons.include_in_emails IS 'True = include in email marketing campaigns';
COMMENT ON COLUMN promotional_coupons.single_use IS 'True = can only be used once per customer';
COMMENT ON COLUMN promotional_coupons.applies_to_courses IS 'JSON array of course IDs this coupon applies to (NULL = all courses)';
COMMENT ON COLUMN promotional_coupons.min_order_amount IS 'Minimum order amount in cents required to use coupon';

COMMIT;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this after the migration to verify all tables exist:
/*
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'menuca_v3' AND information_schema.columns.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'menuca_v3' 
  AND table_name IN (
    'admin_roles', 
    'blacklist', 
    'franchises', 
    'franchise_commission_rules',
    'order_cancellation_requests',
    'email_templates',
    'restaurant_citations',
    'restaurant_banners',
    'restaurant_bank_accounts',
    'restaurant_redirects',
    'restaurant_charges'
  )
ORDER BY table_name;

-- Verify default roles were inserted:
SELECT id, name, is_system_role FROM admin_roles ORDER BY id;

-- Verify new columns were added:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'menuca_v3' 
  AND table_name = 'restaurants' 
  AND column_name = 'franchise_id';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'menuca_v3' 
  AND table_name = 'admin_user_restaurants' 
  AND column_name = 'role_id';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'menuca_v3' 
  AND table_name = 'promotional_coupons' 
  AND column_name IN ('email_exclusive', 'include_in_emails', 'single_use', 'applies_to_courses', 'min_order_amount');
*/
