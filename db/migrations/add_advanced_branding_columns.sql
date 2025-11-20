-- Add advanced branding columns to restaurants table
ALTER TABLE menuca_v3.restaurants 
  ADD COLUMN IF NOT EXISTS banner_image_url TEXT,
  ADD COLUMN IF NOT EXISTS button_style VARCHAR(20) DEFAULT 'rounded' CHECK (button_style IN ('rounded', 'square')),
  ADD COLUMN IF NOT EXISTS menu_layout VARCHAR(20) DEFAULT 'grid' CHECK (menu_layout IN ('grid', 'list'));

-- Add comments
COMMENT ON COLUMN menuca_v3.restaurants.banner_image_url IS 'URL to restaurant header/banner image in Supabase Storage (restaurant-images bucket)';
COMMENT ON COLUMN menuca_v3.restaurants.button_style IS 'Button style preference for menu page (rounded or square corners)';
COMMENT ON COLUMN menuca_v3.restaurants.menu_layout IS 'Menu display layout preference (grid or list view)';
