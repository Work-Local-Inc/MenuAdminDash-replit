-- Menu.ca V3 Hybrid Schema
-- Bridges Industry Standard Modifier System with V1/V2 Combo Groups Legacy
-- 
-- STRATEGY: Keep both systems, map between them, migrate gradually
-- Industry terms on the surface, legacy structure underneath
-- 
-- CRITICAL: This is a MULTI-TENANT system - all modifiers are location-specific
-- Each restaurant_id isolates data completely

-- ============================================
-- MAPPING TABLE: Bridge Old to New
-- ============================================

-- This is the KEY to backward compatibility
-- Maps your existing combo_groups to industry-standard modifier_groups
CREATE TABLE combo_group_to_modifier_group_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- V1/V2 Legacy side
    combo_group_id UUID NOT NULL REFERENCES combo_groups(id) ON DELETE CASCADE,
    combo_group_section_id UUID REFERENCES combo_group_sections(id),
    
    -- New industry standard side
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    
    -- Metadata
    migration_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'migrated', 'verified'
    migrated_at TIMESTAMPTZ,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(combo_group_section_id, modifier_group_id)
);

-- ============================================
-- ENHANCED MODIFIER GROUPS (Industry Standard + Your Fields)
-- ============================================

CREATE TABLE modifier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    
    -- Industry standard fields
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    
    -- Selection rules (industry standard)
    is_required BOOLEAN DEFAULT false,
    is_exclusive BOOLEAN DEFAULT false,
    min_selections INTEGER DEFAULT 0,
    max_selections INTEGER,
    free_quantity INTEGER DEFAULT 0, -- Maps to your combo_group_sections.free_items
    
    -- Pricing model
    pricing_model VARCHAR(20) DEFAULT 'per_item',
    group_price NUMERIC(10,2),
    
    -- YOUR V1/V2 FIELDS mapped
    section_type VARCHAR(50), -- bread, custom_ingredients, dressing, sauce, side_dish, extras, cooking_method
    use_header VARCHAR(255), -- Maps to combo_group_sections.use_header
    display_order SMALLINT DEFAULT 0,
    
    -- Source tracking (for migration)
    source_system VARCHAR(20), -- 'v1', 'v2', 'v3_native'
    source_id INTEGER, -- Original combo_group.source_id or combo_modifier_group.source_id
    
    -- Standard fields
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Add index for section_type queries (you use this a lot)
CREATE INDEX idx_modifier_groups_section_type ON modifier_groups(section_type) WHERE section_type IS NOT NULL;
CREATE INDEX idx_modifier_groups_source ON modifier_groups(source_system, source_id) WHERE source_system IS NOT NULL;
CREATE INDEX idx_modifier_groups_restaurant ON modifier_groups(restaurant_id);

-- ============================================
-- ENHANCED MODIFIERS (Industry Standard + Your Fields)
-- ============================================

CREATE TABLE modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    
    -- Industry standard
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    display_order SMALLINT DEFAULT 0,
    
    -- Pricing (can have multiple prices by size variant)
    base_price NUMERIC(10,2) DEFAULT 0,
    
    -- YOUR V1/V2 FIELDS
    type_code TEXT, -- Maps from combo_modifier_groups.type_code
    is_selected BOOLEAN DEFAULT false, -- Maps from combo_modifier_groups.is_selected
    source_id INTEGER, -- Maps from combo_modifiers.source_id
    
    -- Kitchen/prep
    prep_instructions TEXT,
    
    -- Standard fields
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_modifiers_restaurant ON modifiers(restaurant_id);
CREATE INDEX idx_modifiers_source ON modifiers(source_id) WHERE source_id IS NOT NULL;

-- ============================================
-- MODIFIER PRICES (Size Variants)
-- Maps directly to your combo_modifier_prices table
-- ============================================

CREATE TABLE modifier_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modifier_id UUID NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
    
    -- Size variant (Small, Medium, Large, etc.)
    size_variant VARCHAR(50), -- NULL = default/only price
    price NUMERIC(10,2) NOT NULL,
    
    -- Cost tracking (for margin calculations)
    cost NUMERIC(10,2),
    
    display_order SMALLINT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(modifier_id, size_variant)
);

CREATE INDEX idx_modifier_prices_modifier ON modifier_prices(modifier_id);

-- ============================================
-- MODIFIER GROUP ITEMS (Links modifiers to groups)
-- ============================================

CREATE TABLE modifier_group_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    modifier_id UUID NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
    
    -- Can override pricing per group
    override_price NUMERIC(10,2),
    
    -- Display
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(modifier_group_id, modifier_id)
);

CREATE INDEX idx_modifier_group_items_group ON modifier_group_items(modifier_group_id);
CREATE INDEX idx_modifier_group_items_modifier ON modifier_group_items(modifier_id);

-- ============================================
-- NESTED MODIFIERS (For pizza placement, etc.)
-- ============================================

CREATE TABLE modifier_nested_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_modifier_id UUID NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
    nested_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_modifier_id, nested_group_id)
);

CREATE INDEX idx_modifier_nested_groups_parent ON modifier_nested_groups(parent_modifier_id);

-- ============================================
-- MENU ITEM MODIFIER GROUPS
-- Replaces your dish_combo_groups table
-- ============================================

CREATE TABLE menu_item_modifier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE, -- Using your existing dishes table
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    
    -- Display order (important for flow)
    sort_order INTEGER DEFAULT 0,
    
    -- Can override group-level settings per item
    override_required BOOLEAN,
    override_min_selections INTEGER,
    override_max_selections INTEGER,
    override_free_quantity INTEGER,
    
    -- Source tracking
    source_combo_group_id UUID REFERENCES combo_groups(id), -- For migration tracking
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(dish_id, modifier_group_id)
);

CREATE INDEX idx_menu_item_modifier_groups_dish ON menu_item_modifier_groups(dish_id);
CREATE INDEX idx_menu_item_modifier_groups_group ON menu_item_modifier_groups(modifier_group_id);
CREATE INDEX idx_menu_item_modifier_groups_source ON menu_item_modifier_groups(source_combo_group_id) WHERE source_combo_group_id IS NOT NULL;

-- ============================================
-- SECTION TYPE ENUM (Your V1/V2 categories)
-- ============================================

CREATE TYPE section_type_enum AS ENUM (
    'bread',              -- br_id
    'custom_ingredients', -- ci_id  
    'dressing',           -- dr_id
    'sauce',              -- sa_id
    'side_dish',          -- sd_id
    'extras',             -- e_id
    'cooking_method'      -- cm_id
);

-- ============================================
-- ORDER ITEM MODIFIERS (Customer selections)
-- ============================================

CREATE TABLE order_item_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    modifier_id UUID NOT NULL REFERENCES modifiers(id),
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id),
    
    -- For nested modifiers
    parent_modifier_selection_id UUID REFERENCES order_item_modifiers(id),
    nesting_level INTEGER DEFAULT 1, -- 1 = direct modifier, 2 = nested
    
    -- Pricing snapshot (prices can change, so store what was charged)
    price_charged NUMERIC(10,2) NOT NULL DEFAULT 0,
    
    -- Quantity (for "2x Extra Cheese")
    quantity INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_item_modifiers_order_item ON order_item_modifiers(order_item_id);
CREATE INDEX idx_order_item_modifiers_parent ON order_item_modifiers(parent_modifier_selection_id);

-- ============================================
-- COMPATIBILITY VIEWS
-- ============================================

-- View: Industry-standard API but reads from legacy tables
CREATE OR REPLACE VIEW v_modifier_groups_unified AS
SELECT 
    mg.id,
    mg.restaurant_id,
    mg.name,
    mg.display_name,
    mg.is_required,
    mg.is_exclusive,
    mg.min_selections,
    mg.max_selections,
    mg.free_quantity,
    mg.section_type,
    mg.display_order,
    mg.source_system,
    
    -- Legacy mapping
    cgm.combo_group_id AS legacy_combo_group_id,
    cgm.combo_group_section_id AS legacy_section_id,
    
    -- Status
    CASE 
        WHEN mg.source_system IN ('v1', 'v2') THEN 'migrated'
        WHEN mg.source_system = 'v3_native' THEN 'native'
        ELSE 'unknown'
    END AS data_source
    
FROM modifier_groups mg
LEFT JOIN combo_group_to_modifier_group_mapping cgm ON mg.id = cgm.modifier_group_id;

-- View: Get all modifiers with their price variants
CREATE OR REPLACE VIEW v_modifiers_with_prices AS
SELECT 
    m.id AS modifier_id,
    m.restaurant_id,
    m.name,
    m.display_name,
    m.type_code,
    m.display_order,
    
    -- Aggregate prices as JSON
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'size_variant', mp.size_variant,
                'price', mp.price,
                'is_active', mp.is_active
            ) ORDER BY mp.display_order
        ) FILTER (WHERE mp.id IS NOT NULL),
        '[]'::jsonb
    ) AS price_variants
    
FROM modifiers m
LEFT JOIN modifier_prices mp ON m.id = mp.modifier_id AND mp.is_active = true
WHERE m.is_active = true
GROUP BY m.id, m.restaurant_id, m.name, m.display_name, m.type_code, m.display_order;

-- ============================================
-- MIGRATION FUNCTION: V1/V2 → V3
-- ============================================

CREATE OR REPLACE FUNCTION migrate_combo_group_to_modifier_group(
    p_combo_group_id UUID
) RETURNS UUID AS $$
DECLARE
    v_modifier_group_id UUID;
    v_combo_group RECORD;
    v_section RECORD;
BEGIN
    -- Get combo group details
    SELECT * INTO v_combo_group 
    FROM combo_groups 
    WHERE id = p_combo_group_id;
    
    -- Loop through sections
    FOR v_section IN 
        SELECT * FROM combo_group_sections 
        WHERE combo_group_id = p_combo_group_id 
        AND is_active = true
        ORDER BY display_order
    LOOP
        -- Create modifier_group from section
        INSERT INTO modifier_groups (
            restaurant_id,
            name,
            display_name,
            section_type,
            use_header,
            display_order,
            is_required,
            is_exclusive,
            min_selections,
            max_selections,
            free_quantity,
            source_system,
            source_id
        ) VALUES (
            v_combo_group.restaurant_id,
            v_section.use_header,
            v_section.use_header,
            v_section.section_type,
            v_section.use_header,
            v_section.display_order,
            (v_section.min_selection > 0),
            (v_section.max_selection = 1),
            v_section.min_selection,
            NULLIF(v_section.max_selection, 0),
            v_section.free_items,
            'v2',
            v_combo_group.source_id
        ) RETURNING id INTO v_modifier_group_id;
        
        -- Create mapping
        INSERT INTO combo_group_to_modifier_group_mapping (
            combo_group_id,
            combo_group_section_id,
            modifier_group_id,
            migration_status,
            migrated_at
        ) VALUES (
            p_combo_group_id,
            v_section.id,
            v_modifier_group_id,
            'migrated',
            NOW()
        );
        
    END LOOP;
    
    RETURN v_modifier_group_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Get dish modifiers (works for both systems)
-- ============================================

CREATE OR REPLACE FUNCTION get_dish_modifiers(p_dish_id UUID)
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- First try V3 native
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', mg.id,
            'name', mg.name,
            'display_name', mg.display_name,
            'is_required', mg.is_required,
            'is_exclusive', mg.is_exclusive,
            'min_selections', mg.min_selections,
            'max_selections', mg.max_selections,
            'free_quantity', mg.free_quantity,
            'section_type', mg.section_type,
            'display_order', mimg.sort_order,
            'modifiers', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', m.id,
                        'name', m.name,
                        'display_name', m.display_name,
                        'base_price', m.base_price,
                        'is_default', m.is_default,
                        'display_order', mgi.sort_order,
                        'prices', (
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'size_variant', mp.size_variant,
                                    'price', mp.price
                                ) ORDER BY mp.display_order
                            )
                            FROM modifier_prices mp
                            WHERE mp.modifier_id = m.id AND mp.is_active = true
                        )
                    ) ORDER BY mgi.sort_order
                )
                FROM modifier_group_items mgi
                JOIN modifiers m ON mgi.modifier_id = m.id
                WHERE mgi.modifier_group_id = mg.id AND mgi.is_active = true AND m.is_active = true
            )
        ) ORDER BY mimg.sort_order
    )
    INTO v_result
    FROM menu_item_modifier_groups mimg
    JOIN modifier_groups mg ON mimg.modifier_group_id = mg.id
    WHERE mimg.dish_id = p_dish_id AND mimg.is_active = true AND mg.is_active = true;
    
    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;
