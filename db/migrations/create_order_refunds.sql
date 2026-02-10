-- Order Refunds Table
-- Tracks all refunds processed through the dashboard
-- Each refund creates both a Stripe refund AND an internal accounting adjustment

CREATE TABLE IF NOT EXISTS order_refunds (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  restaurant_id INTEGER NOT NULL,
  
  -- Refund amounts
  refund_amount NUMERIC(10,2) NOT NULL,
  original_order_total NUMERIC(10,2) NOT NULL,
  refund_type VARCHAR(20) NOT NULL CHECK (refund_type IN ('full', 'partial')),
  
  -- Reason tracking
  reason_code VARCHAR(50) NOT NULL CHECK (reason_code IN (
    'customer_cancellation',
    'restaurant_issue',
    'platform_issue',
    'fraud_chargeback',
    'goodwill',
    'duplicate_order',
    'other'
  )),
  notes TEXT,
  
  -- Stripe integration
  stripe_refund_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  stripe_refund_status VARCHAR(50) DEFAULT 'succeeded',
  
  -- Accounting reversals (amounts reversed from the original order's fees)
  commission_reversed NUMERIC(10,2) DEFAULT 0,
  delivery_commission_reversed NUMERIC(10,2) DEFAULT 0,
  transaction_fee_reversed NUMERIC(10,2) DEFAULT 0,
  bank_fee_reversed NUMERIC(10,2) DEFAULT 0,
  hst_reversed NUMERIC(10,2) DEFAULT 0,
  
  -- Links to accounting system
  adjustment_id INTEGER,
  applies_to_week_start DATE,
  applies_to_week_end DATE,
  
  -- Audit trail
  refunded_by INTEGER NOT NULL,
  refunded_by_email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Status
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_order_refunds_order_id ON order_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_order_refunds_restaurant_id ON order_refunds(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_refunds_created_at ON order_refunds(created_at);
CREATE INDEX IF NOT EXISTS idx_order_refunds_stripe_refund_id ON order_refunds(stripe_refund_id);
CREATE INDEX IF NOT EXISTS idx_order_refunds_adjustment_id ON order_refunds(adjustment_id);
