-- Add is_test_order column to orders table for auto-expiring test orders feature
-- When a restaurant is in TEST payment mode, orders are tagged as test orders
-- The tablet stops showing test orders after 10 minutes
ALTER TABLE menuca_v3.orders ADD COLUMN IF NOT EXISTS is_test_order boolean DEFAULT false;
