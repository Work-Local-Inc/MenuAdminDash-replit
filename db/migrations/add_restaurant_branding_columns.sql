-- Add branding columns to restaurants table
ALTER TABLE restaurants 
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#666666',
  ADD COLUMN IF NOT EXISTS font_family VARCHAR(100) DEFAULT 'Inter';

-- Add comment
COMMENT ON COLUMN restaurants.logo_url IS 'URL to restaurant logo image in Supabase Storage';
COMMENT ON COLUMN restaurants.primary_color IS 'Primary brand color (hex format)';
COMMENT ON COLUMN restaurants.secondary_color IS 'Secondary brand color (hex format)';
COMMENT ON COLUMN restaurants.font_family IS 'Brand font family name';
