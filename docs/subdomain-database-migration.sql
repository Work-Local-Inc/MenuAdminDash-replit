-- Subdomain Routing Database Migration
-- Run this in Supabase SQL Editor to create the restaurant_subdomains table

-- Create the table in menuca_v3 schema
CREATE TABLE IF NOT EXISTS menuca_v3.restaurant_subdomains (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL,
    subdomain VARCHAR(100) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key to restaurants table
    CONSTRAINT fk_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES menuca_v3.restaurants(id)
        ON DELETE CASCADE,
    
    -- Each subdomain must be unique when active
    CONSTRAINT unique_active_subdomain
        UNIQUE (subdomain, is_active)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_subdomains_subdomain ON menuca_v3.restaurant_subdomains(subdomain) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subdomains_restaurant ON menuca_v3.restaurant_subdomains(restaurant_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION menuca_v3.update_subdomain_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_restaurant_subdomains_timestamp
    BEFORE UPDATE ON menuca_v3.restaurant_subdomains
    FOR EACH ROW
    EXECUTE FUNCTION menuca_v3.update_subdomain_timestamp();

-- Create RPC function for middleware to call (fast lookup)
CREATE OR REPLACE FUNCTION menuca_v3.get_subdomain_mapping(p_subdomain VARCHAR)
RETURNS TABLE (
    restaurant_id INTEGER,
    subdomain VARCHAR,
    slug VARCHAR,
    name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rs.restaurant_id,
        rs.subdomain,
        rs.slug,
        rs.name
    FROM menuca_v3.restaurant_subdomains rs
    WHERE rs.subdomain = LOWER(p_subdomain)
    AND rs.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to get all active subdomains (for cache warmup)
CREATE OR REPLACE FUNCTION menuca_v3.get_all_subdomain_mappings()
RETURNS TABLE (
    restaurant_id INTEGER,
    subdomain VARCHAR,
    slug VARCHAR,
    name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rs.restaurant_id,
        rs.subdomain,
        rs.slug,
        rs.name
    FROM menuca_v3.restaurant_subdomains rs
    WHERE rs.is_active = true
    ORDER BY rs.subdomain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert initial mapping for Orchid Sushi
INSERT INTO menuca_v3.restaurant_subdomains (restaurant_id, subdomain, slug, name, is_primary)
VALUES (245, 'orchidsushiottawa', 'orchid-sushi-245', 'Orchid Sushi Ottawa', true)
ON CONFLICT DO NOTHING;

-- Grant permissions for anon role (for public API access)
GRANT SELECT ON menuca_v3.restaurant_subdomains TO anon;
GRANT EXECUTE ON FUNCTION menuca_v3.get_subdomain_mapping TO anon;
GRANT EXECUTE ON FUNCTION menuca_v3.get_all_subdomain_mappings TO anon;
