-- ============================================
-- Add items JSONB column to orders table
-- ============================================
-- This allows storing order items directly in the orders table
-- as JSONB for flexibility with dish customizations and modifiers

-- Add items column to orders table  
ALTER TABLE menuca_v3.orders
  ADD COLUMN IF NOT EXISTS items JSONB;

-- Add index for querying items
CREATE INDEX IF NOT EXISTS idx_orders_items ON menuca_v3.orders USING GIN (items);

-- Add comment
COMMENT ON COLUMN menuca_v3.orders.items IS 'Order items with dish details, modifiers, quantities, and prices stored as JSONB array';

-- Verification
SELECT 'Successfully added items column to orders table!' AS status;
