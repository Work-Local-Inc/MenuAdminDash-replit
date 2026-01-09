-- Google Analytics Configuration for Menu.ca Restaurants
-- Purpose: Store per-restaurant GA4 measurement IDs for customer-facing order tracking
-- Run this SQL in your Supabase SQL Editor

-- Create restaurant analytics config table
CREATE TABLE IF NOT EXISTS menuca_v3.restaurant_analytics_configs (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() NOT NULL,
    restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id) ON DELETE CASCADE,
    ga_measurement_id TEXT, -- GA4 format: G-XXXXXXXXXX
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ,
    UNIQUE(restaurant_id)
);

-- Add comment for documentation
COMMENT ON TABLE menuca_v3.restaurant_analytics_configs IS 
'Per-restaurant Google Analytics GA4 configuration for customer-facing order tracking';

COMMENT ON COLUMN menuca_v3.restaurant_analytics_configs.ga_measurement_id IS 
'GA4 Measurement ID in format G-XXXXXXXXXX. NULL means no tracking for this restaurant.';

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_restaurant_analytics_configs_restaurant_id 
ON menuca_v3.restaurant_analytics_configs(restaurant_id);

-- Example: Add GA config for Orchid Sushi (restaurant_id 245)
-- INSERT INTO menuca_v3.restaurant_analytics_configs (restaurant_id, ga_measurement_id)
-- VALUES (245, 'G-XXXXXXXXXX');

-- Bulk insert template (replace with actual data):
-- INSERT INTO menuca_v3.restaurant_analytics_configs (restaurant_id, ga_measurement_id)
-- VALUES 
--   (245, 'G-ORCHIDSUSHI'),
--   (123, 'G-RESTAURANT2'),
--   (456, 'G-RESTAURANT3');

-- Verify table was created
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'menuca_v3' 
AND table_name = 'restaurant_analytics_configs';
