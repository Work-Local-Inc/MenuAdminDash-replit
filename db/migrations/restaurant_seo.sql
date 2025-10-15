-- Create restaurant_seo table
CREATE TABLE IF NOT EXISTS restaurant_seo (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE UNIQUE,
  meta_title VARCHAR(60),
  meta_description VARCHAR(160),
  og_title VARCHAR(60),
  og_description VARCHAR(160),
  og_image_url TEXT,
  include_in_sitemap BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_restaurant_seo_restaurant_id ON restaurant_seo(restaurant_id);

-- Add comment
COMMENT ON TABLE restaurant_seo IS 'SEO metadata and Open Graph tags for restaurant pages';
