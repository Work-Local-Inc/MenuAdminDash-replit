-- Menu.ca Modifier System Schema
-- Supports nested modifiers, pizza placement, and complex ordering flows
-- NOTE: This is a MULTI-TENANT system - all modifiers are location-specific

-- ============================================
-- CORE TABLES
-- ============================================

-- Main menu items (pizzas, wings, etc)
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    category_id UUID REFERENCES categories(id),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- MODIFIER GROUPS (Level 1)
-- ============================================

CREATE TABLE modifier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    name VARCHAR(255) NOT NULL, -- "Crust Type", "Toppings", "Wing Sauce"
    display_name VARCHAR(255), -- Customer-facing name
    description TEXT,
    
    -- Selection rules
    is_required BOOLEAN DEFAULT false, -- Must select something?
    is_exclusive BOOLEAN DEFAULT false, -- Can only pick one? (radio vs checkbox)
    min_selections INTEGER DEFAULT 0, -- Minimum picks required
    max_selections INTEGER, -- NULL = unlimited
    free_quantity INTEGER DEFAULT 0, -- First X are free (like "2 free toppings")
    
    -- Pricing model
    pricing_model VARCHAR(20) DEFAULT 'per_item', -- 'per_item', 'as_group', 'free_up_to_x'
    group_price DECIMAL(10,2), -- Price for entire group (if pricing_model = 'as_group')
    
    -- Display
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Link modifier groups to menu items
CREATE TABLE menu_item_modifier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0, -- Order to display groups
    
    -- Can override group-level settings per item if needed
    override_required BOOLEAN,
    override_min_selections INTEGER,
    override_max_selections INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(menu_item_id, modifier_group_id)
);

-- ============================================
-- MODIFIERS (The actual options)
-- ============================================

CREATE TABLE modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    name VARCHAR(255) NOT NULL, -- "Pepperoni", "Thin Crust", "BBQ Sauce"
    display_name VARCHAR(255), -- Customer-facing name
    description TEXT,
    
    -- Pricing
    price DECIMAL(10,2) DEFAULT 0, -- Additional cost
    
    -- Kitchen/prep info
    prep_instructions TEXT, -- Special prep notes
    
    -- Display
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- Pre-selected by default?
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Link modifiers to modifier groups
CREATE TABLE modifier_group_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    modifier_id UUID NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
    
    -- Can override pricing per group
    override_price DECIMAL(10,2),
    
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(modifier_group_id, modifier_id)
);

-- ============================================
-- NESTED MODIFIERS (Level 2)
-- For things like "Topping Placement" attached to toppings
-- ============================================

CREATE TABLE modifier_nested_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_modifier_id UUID NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
    nested_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    
    -- Display
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(parent_modifier_id, nested_group_id)
);

-- ============================================
-- ORDER TABLES (How customer selections are stored)
-- ============================================

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    base_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL, -- base + all modifiers
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Customer's modifier selections for their order
CREATE TABLE order_item_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    modifier_id UUID NOT NULL REFERENCES modifiers(id),
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id),
    
    -- For nested modifiers
    parent_modifier_selection_id UUID REFERENCES order_item_modifiers(id), -- NULL if level 1
    nesting_level INTEGER DEFAULT 1, -- 1 = direct modifier, 2 = nested
    
    -- Pricing snapshot (prices can change, so store what was charged)
    price_charged DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Quantity (for "2x Extra Cheese")
    quantity INTEGER DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_modifier_groups_restaurant ON modifier_groups(restaurant_id);
CREATE INDEX idx_modifiers_restaurant ON modifiers(restaurant_id);
CREATE INDEX idx_menu_item_modifier_groups_item ON menu_item_modifier_groups(menu_item_id);
CREATE INDEX idx_menu_item_modifier_groups_group ON menu_item_modifier_groups(modifier_group_id);
CREATE INDEX idx_modifier_group_items_group ON modifier_group_items(modifier_group_id);
CREATE INDEX idx_modifier_group_items_modifier ON modifier_group_items(modifier_id);
CREATE INDEX idx_modifier_nested_groups_parent ON modifier_nested_groups(parent_modifier_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_item_modifiers_order_item ON order_item_modifiers(order_item_id);
CREATE INDEX idx_order_item_modifiers_parent ON order_item_modifiers(parent_modifier_selection_id);

-- ============================================
-- EXAMPLE DATA: Pizza with toppings and placement
-- ============================================

-- Insert a pizza item
INSERT INTO menu_items (id, restaurant_id, name, base_price) 
VALUES ('pizza-123', 'rest-001', 'Large Pepperoni Pizza', 18.99);

-- Create "Crust Type" modifier group
INSERT INTO modifier_groups (id, restaurant_id, name, is_required, is_exclusive, min_selections, max_selections)
VALUES ('group-crust', 'rest-001', 'Crust Type', true, true, 1, 1);

-- Create crust modifiers
INSERT INTO modifiers (id, restaurant_id, name, price) VALUES
('mod-thin', 'rest-001', 'Thin Crust', 0),
('mod-hand', 'rest-001', 'Hand Tossed', 0),
('mod-stuffed', 'rest-001', 'Stuffed Crust', 2.00);

-- Link crusts to group
INSERT INTO modifier_group_items (modifier_group_id, modifier_id, sort_order) VALUES
('group-crust', 'mod-thin', 1),
('group-crust', 'mod-hand', 2),
('group-crust', 'mod-stuffed', 3);

-- Attach crust group to pizza
INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order)
VALUES ('pizza-123', 'group-crust', 1);

-- Create "Additional Toppings" modifier group
INSERT INTO modifier_groups (id, restaurant_id, name, is_required, is_exclusive, min_selections, max_selections, free_quantity)
VALUES ('group-toppings', 'rest-001', 'Additional Toppings', false, false, 0, 10, 2);

-- Create topping modifiers
INSERT INTO modifiers (id, restaurant_id, name, price) VALUES
('mod-pepperoni', 'rest-001', 'Pepperoni', 1.50),
('mod-mushrooms', 'rest-001', 'Mushrooms', 1.00),
('mod-extra-cheese', 'rest-001', 'Extra Cheese', 1.50);

-- Link toppings to group
INSERT INTO modifier_group_items (modifier_group_id, modifier_id) VALUES
('group-toppings', 'mod-pepperoni'),
('group-toppings', 'mod-mushrooms'),
('group-toppings', 'mod-extra-cheese');

-- Create "Topping Placement" nested group (for pizza halves)
INSERT INTO modifier_groups (id, restaurant_id, name, is_required, is_exclusive, min_selections, max_selections)
VALUES ('group-placement', 'rest-001', 'Topping Placement', true, true, 1, 1);

-- Create placement modifiers
INSERT INTO modifiers (id, restaurant_id, name, price) VALUES
('mod-whole', 'rest-001', 'Whole Pizza', 0),
('mod-left', 'rest-001', 'Left Half Only', 0),
('mod-right', 'rest-001', 'Right Half Only', 0);

-- Link placements to group
INSERT INTO modifier_group_items (modifier_group_id, modifier_id) VALUES
('group-placement', 'mod-whole'),
('group-placement', 'mod-left'),
('group-placement', 'mod-right');

-- ATTACH placement group to each topping as nested modifier
INSERT INTO modifier_nested_groups (parent_modifier_id, nested_group_id) VALUES
('mod-pepperoni', 'group-placement'),
('mod-mushrooms', 'group-placement'),
('mod-extra-cheese', 'group-placement');

-- Attach toppings group to pizza
INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order)
VALUES ('pizza-123', 'group-toppings', 2);
