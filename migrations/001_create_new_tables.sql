-- ============================================
-- Menu.ca V3 - New Tables Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. ORDER CANCELLATION REQUESTS
CREATE TABLE IF NOT EXISTS menuca_v3.order_cancellation_requests (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  order_created_at TIMESTAMPTZ NOT NULL,
  requested_by_user_id BIGINT REFERENCES menuca_v3.users(id),
  requested_by_admin_id BIGINT REFERENCES menuca_v3.admin_users(id),
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_by_admin_id BIGINT REFERENCES menuca_v3.admin_users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cancellation_requests_order ON menuca_v3.order_cancellation_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_status ON menuca_v3.order_cancellation_requests(status);

-- 2. BLACKLIST
CREATE TABLE IF NOT EXISTS menuca_v3.blacklist (
  id BIGSERIAL PRIMARY KEY,
  identifier_type VARCHAR(20) NOT NULL,
  identifier_value VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  blocked_by_admin_id BIGINT REFERENCES menuca_v3.admin_users(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (identifier_type, identifier_value)
);

CREATE INDEX IF NOT EXISTS idx_blacklist_identifier ON menuca_v3.blacklist(identifier_type, identifier_value);

-- 3. EMAIL TEMPLATES
CREATE TABLE IF NOT EXISTS menuca_v3.email_templates (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT REFERENCES menuca_v3.restaurants(id),
  template_type VARCHAR(50) NOT NULL,
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, template_type, language)
);

-- 4. ADMIN ROLES (RBAC)
CREATE TABLE IF NOT EXISTS menuca_v3.admin_roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL,
  is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add role reference to admin_user_restaurants
ALTER TABLE menuca_v3.admin_user_restaurants
  ADD COLUMN IF NOT EXISTS role_id BIGINT REFERENCES menuca_v3.admin_roles(id);

-- Insert default roles
INSERT INTO menuca_v3.admin_roles (name, description, permissions, is_system_role) VALUES
('Super Admin', 'Full platform access', '{"page_access": ["*"], "restaurant_access": ["*"]}', true),
('Restaurant Manager', 'Manage assigned restaurants', '{"page_access": ["menu", "deals", "orders", "analytics"], "restaurant_access": ["assigned"]}', true),
('Staff', 'View-only access', '{"page_access": ["orders"], "restaurant_access": ["assigned"]}', true)
ON CONFLICT (name) DO NOTHING;

-- 5. RESTAURANT CITATIONS (SEO)
CREATE TABLE IF NOT EXISTS menuca_v3.restaurant_citations (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  citation_type VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, citation_type)
);

-- 6. RESTAURANT BANNERS
CREATE TABLE IF NOT EXISTS menuca_v3.restaurant_banners (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  name VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_restaurant ON menuca_v3.restaurant_banners(restaurant_id, display_order);

-- 7. RESTAURANT IMAGES (Gallery)
CREATE TABLE IF NOT EXISTS menuca_v3.restaurant_images (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  image_url TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. RESTAURANT FEEDBACK
CREATE TABLE IF NOT EXISTS menuca_v3.restaurant_feedback (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  user_id BIGINT REFERENCES menuca_v3.users(id),
  order_id BIGINT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  response TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_feedback_restaurant ON menuca_v3.restaurant_feedback(restaurant_id, rating);

-- 9. RESTAURANT CUSTOM CSS
CREATE TABLE IF NOT EXISTS menuca_v3.restaurant_custom_css (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL UNIQUE REFERENCES menuca_v3.restaurants(id),
  css_content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. RESTAURANT BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS menuca_v3.restaurant_bank_accounts (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL UNIQUE REFERENCES menuca_v3.restaurants(id),
  bank_name VARCHAR(255),
  account_number VARCHAR(255),
  routing_number VARCHAR(255),
  account_holder_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. RESTAURANT PAYMENT METHODS
CREATE TABLE IF NOT EXISTS menuca_v3.restaurant_payment_methods (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  payment_provider VARCHAR(50) NOT NULL,
  provider_account_id VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. RESTAURANT REDIRECTS (SEO)
CREATE TABLE IF NOT EXISTS menuca_v3.restaurant_redirects (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  from_path VARCHAR(500) NOT NULL,
  to_path VARCHAR(500) NOT NULL,
  redirect_type INTEGER NOT NULL DEFAULT 301,
  hit_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, from_path)
);

-- 13. RESTAURANT CHARGES
CREATE TABLE IF NOT EXISTS menuca_v3.restaurant_charges (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  charge_type VARCHAR(20) NOT NULL,
  is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
  is_credit BOOLEAN NOT NULL DEFAULT FALSE,
  frequency VARCHAR(20) NOT NULL DEFAULT 'one_time',
  scope VARCHAR(50) NOT NULL DEFAULT 'all',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. FRANCHISES
CREATE TABLE IF NOT EXISTS menuca_v3.franchises (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_admin_id BIGINT REFERENCES menuca_v3.admin_users(id),
  legal_name VARCHAR(255),
  tax_id VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add franchise reference to restaurants
ALTER TABLE menuca_v3.restaurants
  ADD COLUMN IF NOT EXISTS franchise_id BIGINT REFERENCES menuca_v3.franchises(id);

-- 15. FRANCHISE COMMISSION RULES
CREATE TABLE IF NOT EXISTS menuca_v3.franchise_commission_rules (
  id BIGSERIAL PRIMARY KEY,
  franchise_id BIGINT NOT NULL REFERENCES menuca_v3.franchises(id),
  commission_split_type VARCHAR(20) NOT NULL DEFAULT 'equal',
  commission_percentage NUMERIC(5, 2),
  distribution_rules JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- UPDATE EXISTING TABLES
-- ============================================

-- Extend promotional_coupons for email campaigns
ALTER TABLE menuca_v3.promotional_coupons
  ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'restaurant',
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS allow_reorder BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS single_use BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS exempt_courses BIGINT[],
  ADD COLUMN IF NOT EXISTS include_in_email BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_message TEXT;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Migration completed successfully!' AS status;
