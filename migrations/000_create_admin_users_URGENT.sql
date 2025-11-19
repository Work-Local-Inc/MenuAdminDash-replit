-- ============================================
-- URGENT: Create admin_users + admin_roles tables in menuca_v3
-- These tables are REQUIRED for authentication to work
-- Run this in Supabase SQL Editor immediately
-- ============================================

-- Step 1: Create admin_roles table first (referenced by admin_users)
CREATE TABLE IF NOT EXISTS menuca_v3.admin_roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL,
  is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default roles
INSERT INTO menuca_v3.admin_roles (name, description, permissions, is_system_role) VALUES
('Super Admin', 'Full platform access', '{"page_access": ["*"], "restaurant_access": ["*"]}', true),
('Restaurant Manager', 'Manage assigned restaurants', '{"page_access": ["menu", "deals", "orders", "analytics"], "restaurant_access": ["assigned"]}', true),
('Staff', 'View-only access', '{"page_access": ["orders"], "restaurant_access": ["assigned"]}', true)
ON CONFLICT (name) DO NOTHING;

-- Step 2: Create admin_users table
CREATE TABLE IF NOT EXISTS menuca_v3.admin_users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  password_hash VARCHAR(255),
  role_id BIGINT REFERENCES menuca_v3.admin_roles(id),
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON menuca_v3.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_deleted ON menuca_v3.admin_users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON menuca_v3.admin_users(role_id);

-- Create admin_user_restaurants junction table (many-to-many)
CREATE TABLE IF NOT EXISTS menuca_v3.admin_user_restaurants (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT NOT NULL REFERENCES menuca_v3.admin_users(id) ON DELETE CASCADE,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id) ON DELETE CASCADE,
  role_id BIGINT REFERENCES menuca_v3.admin_roles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (admin_user_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_user_restaurants_admin ON menuca_v3.admin_user_restaurants(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_restaurants_restaurant ON menuca_v3.admin_user_restaurants(restaurant_id);

-- Add the first admin user (brian+1@worklocal.ca)
-- Note: No password_hash needed since they use Supabase Auth
INSERT INTO menuca_v3.admin_users (email, first_name, last_name, role_id)
VALUES ('brian+1@worklocal.ca', 'Brian', 'Admin', 1)
ON CONFLICT (email) DO NOTHING;

-- Grant this admin access to all restaurants (Super Admin)
-- Uncomment this if you want full access to all 961 restaurants:
-- INSERT INTO menuca_v3.admin_user_restaurants (admin_user_id, restaurant_id, role_id)
-- SELECT 
--   (SELECT id FROM menuca_v3.admin_users WHERE email = 'brian+1@worklocal.ca'),
--   id,
--   1
-- FROM menuca_v3.restaurants
-- ON CONFLICT (admin_user_id, restaurant_id) DO NOTHING;

-- Verify the admin user was created
SELECT 
  au.id,
  au.email,
  au.first_name,
  au.last_name,
  ar.name as role_name,
  au.created_at,
  COUNT(aur.restaurant_id) as restaurant_count
FROM menuca_v3.admin_users au
LEFT JOIN menuca_v3.admin_roles ar ON au.role_id = ar.id
LEFT JOIN menuca_v3.admin_user_restaurants aur ON au.id = aur.admin_user_id
WHERE au.email = 'brian+1@worklocal.ca'
GROUP BY au.id, au.email, au.first_name, au.last_name, ar.name, au.created_at;
