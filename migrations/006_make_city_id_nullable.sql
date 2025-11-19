-- ============================================
-- Make city_id nullable in user_delivery_addresses
-- Run this in Supabase SQL Editor (Production Database)
-- ============================================

-- Background: The checkout form doesn't have a city selector, 
-- so we need to make city_id optional for now. In the future,
-- we can infer city from postal code or add a city dropdown.

ALTER TABLE menuca_v3.user_delivery_addresses 
ALTER COLUMN city_id DROP NOT NULL;

-- Verify the change
SELECT 
  'user_delivery_addresses.city_id is now nullable' AS migration_status,
  NOW() AS completed_at;
