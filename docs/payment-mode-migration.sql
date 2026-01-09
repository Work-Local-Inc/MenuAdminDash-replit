-- Payment Mode Migration for Menu.ca
-- Purpose: Add per-restaurant payment mode (test/live) to enable gradual production rollout
-- Run this SQL in your Supabase SQL Editor

-- Add payment_mode column to delivery_and_pickup_configs table
-- This allows each restaurant to independently control whether to use test or live Stripe keys
ALTER TABLE menuca_v3.delivery_and_pickup_configs 
ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'test' CHECK (payment_mode IN ('test', 'live'));

-- Add comment for documentation
COMMENT ON COLUMN menuca_v3.delivery_and_pickup_configs.payment_mode IS 
'Payment mode: test (use test Stripe keys) or live (use production Stripe keys). Default is test for safety.';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'menuca_v3' 
AND table_name = 'delivery_and_pickup_configs' 
AND column_name = 'payment_mode';
