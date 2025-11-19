-- ============================================
-- Menu.ca V3 - Add Uniqueness Constraints for Payment Intent IDs
-- Run this in Supabase SQL Editor
-- Prevents duplicate orders from the same payment intent (replay attack protection)
-- ============================================

-- Add UNIQUE constraint to orders table
ALTER TABLE menuca_v3.orders
  ADD CONSTRAINT unique_stripe_payment_intent_id 
  UNIQUE (stripe_payment_intent_id);

-- Add UNIQUE constraint to payment_transactions table
ALTER TABLE menuca_v3.payment_transactions
  ADD CONSTRAINT unique_payment_transaction_intent_id 
  UNIQUE (stripe_payment_intent_id);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Payment intent uniqueness constraints added successfully!' AS status;
