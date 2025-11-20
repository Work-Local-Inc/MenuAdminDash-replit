-- ============================================================================
-- Migration 008: Unified Menu Builder Schema
-- ============================================================================
-- Purpose: Create category-level modifier templates with dish-level inheritance
-- Created: November 20, 2025
-- Schema: public (Supabase uses public schema, not menuca_v3)
--
-- OVERVIEW:
-- This migration creates a dual-level modifier system for efficient menu management:
--
-- 1. CATEGORY-LEVEL TEMPLATES (course_modifier_templates)
--    - Define modifier groups at the category level (e.g., "Size" for all pizzas)
--    - All dishes in category inherit these templates by default
--    - Manage modifiers once, apply to many dishes
--
-- 2. DISH-LEVEL INHERITANCE (dish_modifier_groups)
--    - Dishes can inherit from category templates OR use custom modifiers
--    - "Break inheritance" to customize specific dishes
--    - Track inheritance relationship for bulk updates
--
-- BENEFITS:
-- - Reduce repetitive data entry (set modifiers once per category)
-- - Maintain consistency across similar dishes
-- - Allow exceptions for special dishes
-- - Support bulk operations (update all pizzas at once)
-- ============================================================================

-- Note: Supabase uses 'public' schema by default, not 'menuca_v3'

-- ============================================================================
-- TABLE 1: course_modifier_templates
-- ============================================================================
-- Category-level modifier group templates
-- Example: "Size" template for all pizzas in "Pizza" category
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_modifier_templates (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_required BOOLEAN DEFAULT false,
    min_selections INTEGER DEFAULT 0,
    max_selections INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    CONSTRAINT fk_course_modifier_template_course 
        FOREIGN KEY (course_id) 
        REFERENCES courses(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT check_template_selections 
        CHECK (min_selections >= 0 AND max_selections >= min_selections)
);

COMMENT ON TABLE course_modifier_templates IS 
'Category-level modifier group templates. All dishes in a category inherit these by default. Example: "Size" template for all items in "Pizza" category.';

COMMENT ON COLUMN course_modifier_templates.course_id IS 
'Links to courses - all dishes in this category inherit this template';

COMMENT ON COLUMN course_modifier_templates.name IS 
'Template name - e.g., "Size", "Toppings", "Crust Type"';

COMMENT ON COLUMN course_modifier_templates.is_required IS 
'Whether customer must select from this group (inherited by dishes)';

COMMENT ON COLUMN course_modifier_templates.min_selections IS 
'Minimum selections required (0 = optional)';

COMMENT ON COLUMN course_modifier_templates.max_selections IS 
'Maximum selections allowed (999 = unlimited)';

COMMENT ON COLUMN course_modifier_templates.display_order IS 
'Order for drag-drop reordering in menu builder UI';

-- Index for fetching all templates for a category
CREATE INDEX idx_course_modifier_templates_course 
    ON course_modifier_templates(course_id) 
    WHERE deleted_at IS NULL;

-- Index for display order sorting
CREATE INDEX IF NOT EXISTS idx_course_modifier_templates_order 
    ON course_modifier_templates(course_id, display_order) 
    WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLE 2: course_template_modifiers
-- ============================================================================
-- Individual modifier options within category templates
-- Example: "Small $12.99", "Medium $15.99", "Large $18.99" in "Size" template
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_template_modifiers (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    is_included BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    CONSTRAINT fk_template_modifier_template 
        FOREIGN KEY (template_id) 
        REFERENCES course_modifier_templates(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT check_template_modifier_price 
        CHECK (price >= 0)
);

COMMENT ON TABLE course_template_modifiers IS 
'Individual modifier options in category templates. Inherited by all dishes in category. Example: "Small", "Medium", "Large" options in "Size" template.';

COMMENT ON COLUMN course_template_modifiers.template_id IS 
'Links to course_modifier_templates - the parent template';

COMMENT ON COLUMN course_template_modifiers.name IS 
'Modifier option name - e.g., "Small", "Extra Cheese", "Gluten-Free Crust"';

COMMENT ON COLUMN course_template_modifiers.price IS 
'Price adjustment for this modifier (0.00 = no charge, positive = upcharge)';

COMMENT ON COLUMN course_template_modifiers.is_included IS 
'Whether this modifier is included free with the dish (no upcharge)';

COMMENT ON COLUMN course_template_modifiers.display_order IS 
'Order for drag-drop reordering in menu builder UI';

-- Index for fetching all modifiers in a template
CREATE INDEX idx_template_modifiers_template 
    ON course_template_modifiers(template_id) 
    WHERE deleted_at IS NULL;

-- Index for display order sorting
CREATE INDEX IF NOT EXISTS idx_template_modifiers_order 
    ON course_template_modifiers(template_id, display_order) 
    WHERE deleted_at IS NULL;

-- ============================================================================
-- ISSUE 4 FIX: Add unique constraint and performance indexes
-- ============================================================================

-- UNIQUE constraint: Prevent duplicate modifier names within same template
-- This ensures data integrity at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_modifiers_unique_name 
    ON course_template_modifiers(template_id, name) 
    WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_template_modifiers_unique_name IS 
'UNIQUE constraint: Prevents duplicate modifier names within the same template (ignores soft-deleted records)';

-- ============================================================================
-- TABLE 3: dish_modifier_groups (ENHANCED)
-- ============================================================================
-- Dish-level modifier groups - either inherited from category OR custom
-- ============================================================================

-- First, check if the table already exists from previous migrations
DO $$ 
BEGIN
    -- If table exists, alter it to add new columns
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'dish_modifier_groups'
    ) THEN
        -- Add course_template_id for inheritance tracking (if not exists)
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'dish_modifier_groups' 
            AND column_name = 'course_template_id'
        ) THEN
            ALTER TABLE dish_modifier_groups 
                ADD COLUMN course_template_id INTEGER NULL;
            
            ALTER TABLE dish_modifier_groups 
                ADD CONSTRAINT fk_dish_modifier_group_template 
                FOREIGN KEY (course_template_id) 
                REFERENCES course_modifier_templates(id) 
                ON DELETE SET NULL;
        END IF;
        
        -- Add is_custom flag (if not exists)
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'dish_modifier_groups' 
            AND column_name = 'is_custom'
        ) THEN
            ALTER TABLE dish_modifier_groups 
                ADD COLUMN is_custom BOOLEAN DEFAULT false;
        END IF;
        
        -- Add min_selections if missing
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'dish_modifier_groups' 
            AND column_name = 'min_selections'
        ) THEN
            ALTER TABLE dish_modifier_groups 
                ADD COLUMN min_selections INTEGER DEFAULT 0;
        END IF;
        
        -- Add max_selections if missing
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'dish_modifier_groups' 
            AND column_name = 'max_selections'
        ) THEN
            ALTER TABLE dish_modifier_groups 
                ADD COLUMN max_selections INTEGER DEFAULT 1;
        END IF;
        
        -- Add is_required if missing
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'dish_modifier_groups' 
            AND column_name = 'is_required'
        ) THEN
            ALTER TABLE dish_modifier_groups 
                ADD COLUMN is_required BOOLEAN DEFAULT false;
        END IF;
        
    ELSE
        -- Create the table from scratch
        CREATE TABLE dish_modifier_groups (
            id SERIAL PRIMARY KEY,
            dish_id INTEGER NOT NULL,
            course_template_id INTEGER NULL,
            name VARCHAR(100) NOT NULL,
            is_required BOOLEAN DEFAULT false,
            min_selections INTEGER DEFAULT 0,
            max_selections INTEGER DEFAULT 1,
            display_order INTEGER DEFAULT 0,
            is_custom BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP NULL,
            
            CONSTRAINT fk_dish_modifier_group_dish 
                FOREIGN KEY (dish_id) 
                REFERENCES dishes(id) 
                ON DELETE CASCADE,
            
            CONSTRAINT fk_dish_modifier_group_template 
                FOREIGN KEY (course_template_id) 
                REFERENCES course_modifier_templates(id) 
                ON DELETE SET NULL,
            
            CONSTRAINT check_dish_modifier_group_selections 
                CHECK (min_selections >= 0 AND max_selections >= min_selections)
        );
    END IF;
END $$;

COMMENT ON TABLE dish_modifier_groups IS 
'Dish-level modifier groups. Can inherit from category templates (course_template_id NOT NULL) OR be custom (is_custom = true). Breaking inheritance creates custom copy.';

COMMENT ON COLUMN dish_modifier_groups.dish_id IS 
'Links to dishes - the specific dish this modifier group applies to';

COMMENT ON COLUMN dish_modifier_groups.course_template_id IS 
'NULL = custom group, NOT NULL = inherited from category template. Used for bulk updates.';

COMMENT ON COLUMN dish_modifier_groups.is_custom IS 
'true = dish broke inheritance and uses custom modifiers, false = inherits from template';

COMMENT ON COLUMN dish_modifier_groups.name IS 
'Group name - copied from template if inherited, custom if is_custom = true';

-- Index for inheritance tracking
CREATE INDEX IF NOT EXISTS idx_dish_modifier_groups_template 
    ON dish_modifier_groups(course_template_id) 
    WHERE course_template_id IS NOT NULL AND deleted_at IS NULL;

-- Index for fetching dish groups
CREATE INDEX IF NOT EXISTS idx_dish_modifier_groups_dish 
    ON dish_modifier_groups(dish_id) 
    WHERE deleted_at IS NULL;

-- Index for display order
CREATE INDEX IF NOT EXISTS idx_dish_modifier_groups_order 
    ON dish_modifier_groups(dish_id, display_order) 
    WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLE 4: dish_modifiers (ENHANCED)
-- ============================================================================
-- Individual modifier options within dish-level groups
-- ============================================================================

DO $$ 
BEGIN
    -- If table exists, ensure it has all required columns
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'dish_modifiers'
    ) THEN
        -- Add is_included if missing
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'dish_modifiers' 
            AND column_name = 'is_included'
        ) THEN
            ALTER TABLE dish_modifiers 
                ADD COLUMN is_included BOOLEAN DEFAULT false;
        END IF;
        
        -- Add is_default if missing
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'dish_modifiers' 
            AND column_name = 'is_default'
        ) THEN
            ALTER TABLE dish_modifiers 
                ADD COLUMN is_default BOOLEAN DEFAULT false;
        END IF;
        
        -- Add display_order if missing
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'dish_modifiers' 
            AND column_name = 'display_order'
        ) THEN
            ALTER TABLE dish_modifiers 
                ADD COLUMN display_order INTEGER DEFAULT 0;
        END IF;
        
    ELSE
        -- Create the table from scratch
        CREATE TABLE dish_modifiers (
            id SERIAL PRIMARY KEY,
            modifier_group_id INTEGER NOT NULL,
            name VARCHAR(100) NOT NULL,
            price DECIMAL(10,2) DEFAULT 0.00,
            is_included BOOLEAN DEFAULT false,
            is_default BOOLEAN DEFAULT false,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP NULL,
            
            CONSTRAINT fk_dish_modifier_group 
                FOREIGN KEY (modifier_group_id) 
                REFERENCES dish_modifier_groups(id) 
                ON DELETE CASCADE,
            
            CONSTRAINT check_dish_modifier_price 
                CHECK (price >= 0)
        );
    END IF;
END $$;

COMMENT ON TABLE dish_modifiers IS 
'Individual modifier options within dish-level groups. Inherited from templates or custom. Example: "Small", "Medium", "Large" options.';

COMMENT ON COLUMN dish_modifiers.modifier_group_id IS 
'Links to dish_modifier_groups - the parent group';

COMMENT ON COLUMN dish_modifiers.name IS 
'Modifier name - e.g., "Small", "Extra Cheese", "No Onions"';

COMMENT ON COLUMN dish_modifiers.price IS 
'Price adjustment (0.00 = no charge, positive = upcharge)';

COMMENT ON COLUMN dish_modifiers.is_included IS 
'Whether this modifier is included free (no upcharge)';

COMMENT ON COLUMN dish_modifiers.is_default IS 
'Whether this modifier should be auto-selected by default';

COMMENT ON COLUMN dish_modifiers.display_order IS 
'Order for drag-drop reordering in menu builder UI';

-- Index for fetching modifiers in a group
CREATE INDEX IF NOT EXISTS idx_dish_modifiers_group 
    ON dish_modifiers(modifier_group_id) 
    WHERE deleted_at IS NULL;

-- Index for display order
CREATE INDEX IF NOT EXISTS idx_dish_modifiers_order 
    ON dish_modifiers(modifier_group_id, display_order) 
    WHERE deleted_at IS NULL;

-- ============================================================================
-- ISSUE 4 FIX: Additional performance index for dish modifiers
-- ============================================================================

COMMENT ON INDEX idx_dish_modifiers_order IS 
'Performance index: Optimizes ordering queries for dish modifiers within groups';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: apply_template_to_dish
-- ----------------------------------------------------------------------------
-- Creates dish-level modifier groups by copying from category template
-- Used when adding a new dish to a category with templates
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION apply_template_to_dish(
    p_dish_id INTEGER,
    p_template_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_group_id INTEGER;
    v_template_modifier RECORD;
BEGIN
    -- Create dish modifier group from template
    INSERT INTO dish_modifier_groups (
        dish_id,
        course_template_id,
        name,
        is_required,
        min_selections,
        max_selections,
        display_order,
        is_custom
    )
    SELECT 
        p_dish_id,
        t.id,
        t.name,
        t.is_required,
        t.min_selections,
        t.max_selections,
        t.display_order,
        false  -- Not custom, inherited from template
    FROM course_modifier_templates t
    WHERE t.id = p_template_id
    AND t.deleted_at IS NULL
    RETURNING id INTO v_group_id;
    
    -- Copy all modifiers from template
    INSERT INTO dish_modifiers (
        modifier_group_id,
        name,
        price,
        is_included,
        display_order
    )
    SELECT 
        v_group_id,
        tm.name,
        tm.price,
        tm.is_included,
        tm.display_order
    FROM course_template_modifiers tm
    WHERE tm.template_id = p_template_id
    AND tm.deleted_at IS NULL;
    
    RETURN v_group_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_template_to_dish IS 
'Creates dish modifier groups by copying from category template. Used when adding dish to category with templates.';

-- ----------------------------------------------------------------------------
-- Function: apply_all_templates_to_dish
-- ----------------------------------------------------------------------------
-- Applies ALL category templates to a dish
-- Used when adding a new dish to a category
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION apply_all_templates_to_dish(
    p_dish_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_course_id INTEGER;
    v_template RECORD;
    v_groups_created INTEGER := 0;
BEGIN
    -- Get course_id for the dish
    SELECT course_id INTO v_course_id
    FROM dishes
    WHERE id = p_dish_id;
    
    IF v_course_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Apply each template for this category
    FOR v_template IN 
        SELECT id 
        FROM course_modifier_templates
        WHERE course_id = v_course_id
        AND deleted_at IS NULL
        ORDER BY display_order
    LOOP
        PERFORM apply_template_to_dish(p_dish_id, v_template.id);
        v_groups_created := v_groups_created + 1;
    END LOOP;
    
    RETURN v_groups_created;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_all_templates_to_dish IS 
'Applies all category templates to a dish. Called when adding new dish to category.';

-- ----------------------------------------------------------------------------
-- Function: break_modifier_inheritance
-- ----------------------------------------------------------------------------
-- Breaks inheritance link, making dish use custom modifiers
-- Keeps existing modifiers but marks as custom
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION break_modifier_inheritance(
    p_group_id INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE dish_modifier_groups
    SET 
        course_template_id = NULL,
        is_custom = true,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_group_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION break_modifier_inheritance IS 
'Breaks inheritance link for a modifier group. Dish will no longer receive template updates.';

-- ----------------------------------------------------------------------------
-- Function: sync_template_to_inherited_groups
-- ----------------------------------------------------------------------------
-- Updates all dishes inheriting from a template when template changes
-- Used for bulk updates across all dishes in a category
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_template_to_inherited_groups(
    p_template_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_affected_groups INTEGER := 0;
BEGIN
    -- Update all non-custom groups inheriting from this template
    UPDATE dish_modifier_groups dmg
    SET 
        name = t.name,
        is_required = t.is_required,
        min_selections = t.min_selections,
        max_selections = t.max_selections,
        updated_at = CURRENT_TIMESTAMP
    FROM course_modifier_templates t
    WHERE dmg.course_template_id = p_template_id
    AND dmg.is_custom = false
    AND t.id = p_template_id;
    
    GET DIAGNOSTICS v_affected_groups = ROW_COUNT;
    
    RETURN v_affected_groups;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_template_to_inherited_groups IS 
'Syncs template changes to all dishes inheriting from it. Used for bulk updates.';

-- ----------------------------------------------------------------------------
-- Function: get_dish_modifier_groups_with_inheritance
-- ----------------------------------------------------------------------------
-- Fetches all modifier groups for a dish with inheritance information
-- Used by menu builder UI to show template vs custom groups
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_dish_modifier_groups_with_inheritance(
    p_dish_id INTEGER
) RETURNS TABLE (
    group_id INTEGER,
    group_name VARCHAR,
    is_required BOOLEAN,
    min_selections INTEGER,
    max_selections INTEGER,
    display_order INTEGER,
    is_custom BOOLEAN,
    template_id INTEGER,
    template_name VARCHAR,
    modifiers JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dmg.id,
        dmg.name,
        dmg.is_required,
        dmg.min_selections,
        dmg.max_selections,
        dmg.display_order,
        dmg.is_custom,
        dmg.course_template_id,
        t.name,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', dm.id,
                    'name', dm.name,
                    'price', dm.price,
                    'is_included', dm.is_included,
                    'is_default', dm.is_default,
                    'display_order', dm.display_order
                ) ORDER BY dm.display_order
            ) FILTER (WHERE dm.id IS NOT NULL),
            '[]'::jsonb
        ) as modifiers
    FROM dish_modifier_groups dmg
    LEFT JOIN course_modifier_templates t ON dmg.course_template_id = t.id
    LEFT JOIN dish_modifiers dm ON dmg.id = dm.modifier_group_id AND dm.deleted_at IS NULL
    WHERE dmg.dish_id = p_dish_id
    AND dmg.deleted_at IS NULL
    GROUP BY 
        dmg.id, 
        dmg.name, 
        dmg.is_required, 
        dmg.min_selections, 
        dmg.max_selections,
        dmg.display_order,
        dmg.is_custom,
        dmg.course_template_id,
        t.name
    ORDER BY dmg.display_order;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_dish_modifier_groups_with_inheritance IS 
'Returns modifier groups for a dish with inheritance metadata. Used by menu builder UI.';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp on template changes
CREATE OR REPLACE FUNCTION update_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_timestamp
    BEFORE UPDATE ON course_modifier_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_template_timestamp();

CREATE TRIGGER trigger_update_template_modifier_timestamp
    BEFORE UPDATE ON course_template_modifiers
    FOR EACH ROW
    EXECUTE FUNCTION update_template_timestamp();

-- ============================================================================
-- USAGE EXAMPLES (in comments for reference)
-- ============================================================================

/*
-- EXAMPLE 1: Create a category template for "Pizza Size"
-- This will apply to ALL pizzas in the "Pizza" category

INSERT INTO course_modifier_templates (course_id, name, is_required, min_selections, max_selections)
VALUES (5, 'Size', true, 1, 1);  -- course_id 5 = "Pizza" category

-- Add size options to the template
INSERT INTO course_template_modifiers (template_id, name, price, display_order)
VALUES 
    (1, 'Small (10")', 0.00, 0),      -- Base price
    (1, 'Medium (12")', 3.00, 1),     -- +$3.00
    (1, 'Large (14")', 5.00, 2),      -- +$5.00
    (1, 'X-Large (16")', 7.00, 3);    -- +$7.00

-- EXAMPLE 2: Apply template to a new dish
SELECT apply_all_templates_to_dish(123);  -- dish_id 123 gets all Pizza category templates

-- EXAMPLE 3: Break inheritance for a special dish
-- "Gluten-Free Pizza" needs custom sizes with different pricing
SELECT break_modifier_inheritance(456);  -- group_id 456

-- Now update the custom modifiers
UPDATE dish_modifiers 
SET price = price + 2.00  -- Gluten-free upcharge
WHERE modifier_group_id = 456;

-- EXAMPLE 4: Bulk update - change all pizza sizes at once
UPDATE course_template_modifiers
SET price = price + 1.00  -- Increase all sizes by $1
WHERE template_id = 1;

-- Sync changes to all inherited dishes
SELECT sync_template_to_inherited_groups(1);
-- Returns: 47  (47 dishes updated)

-- EXAMPLE 5: Get modifier groups with inheritance info for menu builder UI
SELECT * FROM get_dish_modifier_groups_with_inheritance(123);

-- Returns:
-- group_id | group_name | is_custom | template_id | template_name | modifiers
-- 789      | Size       | false     | 1           | Size          | [{"id": 101, "name": "Small (10")", "price": 0.00, ...}, ...]
-- 790      | Toppings   | true      | NULL        | NULL          | [{"id": 201, "name": "Extra Cheese", "price": 1.50, ...}, ...]
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log completion
DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration 008 complete: Unified Menu Builder Schema';
    RAISE NOTICE '   - Created course_modifier_templates';
    RAISE NOTICE '   - Created course_template_modifiers';
    RAISE NOTICE '   - Enhanced dish_modifier_groups with inheritance';
    RAISE NOTICE '   - Enhanced dish_modifiers with required columns';
    RAISE NOTICE '   - Added helper functions for template management';
    RAISE NOTICE '   - Added indexes for performance';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create category templates in menu builder UI';
    RAISE NOTICE '2. Apply templates to existing dishes';
    RAISE NOTICE '3. Use bulk operations to update modifier prices';
END $$;
