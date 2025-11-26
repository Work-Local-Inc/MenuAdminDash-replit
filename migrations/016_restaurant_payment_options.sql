-- Migration: Restaurant Payment Options
-- Purpose: Allow restaurants to configure which payment types they accept
-- Date: 2024-11-26

-- Create enum for payment types
DO $$ BEGIN
  CREATE TYPE menuca_v3.payment_option_type AS ENUM (
    'credit_card',      -- Stripe processed by Menu.ca
    'cash',             -- Cash on delivery/pickup
    'interac',          -- Interac e-Transfer
    'credit_at_door',   -- Credit card at door (restaurant's terminal)
    'debit_at_door',    -- Debit at door (restaurant's terminal)
    'credit_debit_at_door' -- Credit or Debit at door
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for applies_to (which order types this payment option applies to)
DO $$ BEGIN
  CREATE TYPE menuca_v3.payment_applies_to AS ENUM (
    'both',      -- Applies to both delivery and pickup
    'delivery',  -- Only for delivery orders
    'pickup'     -- Only for pickup orders
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create restaurant_payment_options table
CREATE TABLE IF NOT EXISTS menuca_v3.restaurant_payment_options (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id) ON DELETE CASCADE,
  payment_type menuca_v3.payment_option_type NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  applies_to menuca_v3.payment_applies_to NOT NULL DEFAULT 'both',
  
  -- Localized labels (override default text)
  label_en VARCHAR(100),
  label_fr VARCHAR(100),
  
  -- Localized instructions (shown to customer at checkout)
  instructions_en TEXT,
  instructions_fr TEXT,
  
  -- Display order for checkout UI
  display_order INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each restaurant can only have one entry per payment type
  UNIQUE(restaurant_id, payment_type)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_restaurant_payment_options_restaurant 
  ON menuca_v3.restaurant_payment_options(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_payment_options_enabled 
  ON menuca_v3.restaurant_payment_options(restaurant_id, enabled) 
  WHERE enabled = true;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION menuca_v3.update_payment_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payment_options_updated_at 
  ON menuca_v3.restaurant_payment_options;

CREATE TRIGGER trigger_update_payment_options_updated_at
  BEFORE UPDATE ON menuca_v3.restaurant_payment_options
  FOR EACH ROW
  EXECUTE FUNCTION menuca_v3.update_payment_options_updated_at();

-- Comment for documentation
COMMENT ON TABLE menuca_v3.restaurant_payment_options IS 
  'Stores which payment methods each restaurant accepts. Credit card payments are processed by Menu.ca via Stripe. Other options (cash, at-door) are handled by the restaurant.';

COMMENT ON COLUMN menuca_v3.restaurant_payment_options.payment_type IS 
  'Type of payment: credit_card (Stripe), cash, interac, credit_at_door, debit_at_door, credit_debit_at_door';

COMMENT ON COLUMN menuca_v3.restaurant_payment_options.applies_to IS 
  'Which order types this payment option is available for: both, delivery, or pickup only';
