-- ============================================
-- PIZZA TOPPING PLACEMENT FEATURE
-- Run this in Supabase SQL Editor
-- ============================================
-- 
-- This adds support for pizza topping placement (whole/left/right)
-- WITHOUT any pricing complexity - placement does NOT affect price
--
-- Tables created/modified:
-- 1. combo_modifier_placements (NEW) - stores which modifiers support placement
-- 2. order_item_modifiers (MODIFIED) - adds placement column for order storage
-- ============================================

-- ============================================
-- TABLE 1: combo_modifier_placements
-- ============================================
-- Links to combo_modifiers to indicate which toppings support placement
-- Only modifiers with rows here will show placement options in UI

CREATE TABLE IF NOT EXISTS menuca_v3.combo_modifier_placements (
    id BIGSERIAL PRIMARY KEY,
    combo_modifier_id BIGINT NOT NULL REFERENCES menuca_v3.combo_modifiers(id) ON DELETE CASCADE,
    placement TEXT NOT NULL CHECK (placement IN ('whole', 'left', 'right')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(combo_modifier_id, placement)
);

-- Index for fast lookups by modifier
CREATE INDEX IF NOT EXISTS idx_combo_modifier_placements_modifier 
ON menuca_v3.combo_modifier_placements(combo_modifier_id);

-- Comment for documentation
COMMENT ON TABLE menuca_v3.combo_modifier_placements IS 
'Pizza topping placement options (whole/left/right). Modifiers with rows here support half-pizza selections. Placement does NOT affect pricing.';

-- ============================================
-- TABLE 2: order_item_modifiers (ADD COLUMN)
-- ============================================
-- If this table already exists, add the placement column
-- If it doesn't exist, create it

DO $$
BEGIN
    -- Check if order_item_modifiers table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'menuca_v3' 
               AND table_name = 'order_item_modifiers') THEN
        -- Add placement column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'menuca_v3' 
                       AND table_name = 'order_item_modifiers' 
                       AND column_name = 'placement') THEN
            ALTER TABLE menuca_v3.order_item_modifiers 
            ADD COLUMN placement TEXT DEFAULT 'whole' 
            CHECK (placement IN ('whole', 'left', 'right'));
            
            RAISE NOTICE 'Added placement column to order_item_modifiers';
        ELSE
            RAISE NOTICE 'placement column already exists in order_item_modifiers';
        END IF;
    ELSE
        -- Create the table if it doesn't exist
        CREATE TABLE menuca_v3.order_item_modifiers (
            id BIGSERIAL PRIMARY KEY,
            order_item_id BIGINT NOT NULL REFERENCES menuca_v3.order_items(id) ON DELETE CASCADE,
            combo_modifier_id BIGINT NOT NULL REFERENCES menuca_v3.combo_modifiers(id),
            combo_modifier_group_id BIGINT REFERENCES menuca_v3.combo_modifier_groups(id),
            size_variant TEXT,
            price_charged NUMERIC(10,2) NOT NULL DEFAULT 0,
            quantity INTEGER DEFAULT 1,
            placement TEXT DEFAULT 'whole' CHECK (placement IN ('whole', 'left', 'right')),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_order_item_modifiers_order_item 
        ON menuca_v3.order_item_modifiers(order_item_id);
        
        RAISE NOTICE 'Created order_item_modifiers table with placement column';
    END IF;
END $$;

-- ============================================
-- HELPER VIEW: Get modifiers with their placements
-- ============================================
CREATE OR REPLACE VIEW menuca_v3.v_modifiers_with_placements AS
SELECT 
    cm.id AS modifier_id,
    cm.name AS modifier_name,
    cm.combo_modifier_group_id,
    COALESCE(
        ARRAY_AGG(cmp.placement ORDER BY cmp.placement) 
        FILTER (WHERE cmp.placement IS NOT NULL),
        ARRAY[]::TEXT[]
    ) AS placements
FROM menuca_v3.combo_modifiers cm
LEFT JOIN menuca_v3.combo_modifier_placements cmp ON cm.id = cmp.combo_modifier_id
GROUP BY cm.id, cm.name, cm.combo_modifier_group_id;

COMMENT ON VIEW menuca_v3.v_modifiers_with_placements IS 
'Returns modifiers with their available placements as an array. Empty array means no placement options (whole pizza only).';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the tables were created correctly:

-- Check combo_modifier_placements table
SELECT 
    'combo_modifier_placements' AS table_name,
    COUNT(*) AS row_count
FROM menuca_v3.combo_modifier_placements;

-- Check order_item_modifiers has placement column
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'menuca_v3' 
AND table_name = 'order_item_modifiers'
AND column_name = 'placement';

-- ============================================
-- SAMPLE: Enable placement for a modifier
-- ============================================
-- To enable placement options for a specific modifier (e.g., Pepperoni):
-- 
-- INSERT INTO menuca_v3.combo_modifier_placements (combo_modifier_id, placement)
-- VALUES 
--     (2168, 'whole'),
--     (2168, 'left'),
--     (2168, 'right');
--
-- This would allow customers to select Pepperoni for whole pizza, left half, or right half.

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Pizza placement tables created successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Use the Admin UI to enable placement for pizza toppings';
    RAISE NOTICE '2. Or manually INSERT into combo_modifier_placements for specific modifiers';
END $$;
