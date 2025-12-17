-- Update menu_layout check constraint to support new layout options
-- Drop the old constraint and add a new one with expanded values

-- First, drop the existing check constraint
ALTER TABLE menuca_v3.restaurants 
  DROP CONSTRAINT IF EXISTS restaurants_menu_layout_check;

-- Add the updated check constraint with all supported layouts
ALTER TABLE menuca_v3.restaurants 
  ADD CONSTRAINT restaurants_menu_layout_check 
  CHECK (menu_layout IN ('list', 'grid', 'grid2', 'grid4', 'image_cards'));

-- Update comment to reflect new options
COMMENT ON COLUMN menuca_v3.restaurants.menu_layout IS 'Menu display layout preference: list (compact rows), grid2 (2 columns), grid4 (responsive 1-4 columns), image_cards (large hero images)';
