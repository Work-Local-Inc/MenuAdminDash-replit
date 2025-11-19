-- Create restaurant_integrations table
CREATE TABLE IF NOT EXISTS restaurant_integrations (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('POS', 'PAYMENT', 'DELIVERY', 'OTHER')),
  provider_name VARCHAR(100),
  api_key TEXT,
  api_secret TEXT,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_restaurant_integrations_restaurant_id 
  ON restaurant_integrations(restaurant_id);

-- Add comment
COMMENT ON TABLE restaurant_integrations IS 'Third-party integrations for restaurants (POS, Payment, Delivery systems)';
