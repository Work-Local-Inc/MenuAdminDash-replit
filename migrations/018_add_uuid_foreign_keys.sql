-- ============================================================================
-- Migration 018: Add UUID Foreign Key Columns (Phase 2)
-- ============================================================================
-- Purpose: Add UUID-based FK columns alongside integer FKs.
--          This lets API routes work with UUIDs end-to-end without extra joins.
--          Integer FKs remain for internal joins — this is additive only.
--
-- Database: Neon PostgreSQL (menuca_v3 schema)
-- Run with: psql "$SUPABASE_BRANCH_DB_URL" -f migrations/018_add_uuid_foreign_keys.sql
--
-- Pattern per FK:
--   1. ADD COLUMN <parent>_uuid UUID
--   2. Backfill from JOIN to parent table
--   3. CREATE INDEX for lookups
--
-- Safe to run multiple times.
-- ============================================================================

SET search_path TO menuca_v3;

-- ============================================================================
-- HELPER: Add a UUID FK column and backfill it from a parent table
-- ============================================================================
CREATE OR REPLACE FUNCTION _add_uuid_fk(
    p_child_table TEXT,
    p_fk_col TEXT,         -- existing integer FK column (e.g., 'restaurant_id')
    p_uuid_col TEXT,       -- new UUID column name (e.g., 'restaurant_uuid')
    p_parent_table TEXT    -- parent table to join against
) RETURNS void AS $$
BEGIN
    -- 1. Add the UUID FK column
    EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I UUID',
        p_child_table, p_uuid_col
    );

    -- 2. Backfill from parent table
    EXECUTE format(
        'UPDATE %I c SET %I = p.uuid FROM %I p WHERE c.%I = p.id AND c.%I IS NULL',
        p_child_table, p_uuid_col, p_parent_table, p_fk_col, p_uuid_col
    );

    -- 3. Index for lookups
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_%s ON %I(%I)',
        p_child_table, p_uuid_col, p_child_table, p_uuid_col
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- restaurant_uuid — core tenant FK on most tables
-- ============================================================================
SELECT _add_uuid_fk('admin_user_restaurants', 'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('combo_groups',           'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('courses',                'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('delivery_and_pickup_configs', 'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('devices',                'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('dishes',                 'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('dish_modifier_prices',   'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('dish_modifiers',         'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('modifier_groups',        'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('orders',                 'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('payment_transactions',   'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('promotion_campaigns',    'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('promotional_coupons',    'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('promotional_deals',      'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('upsell_rules',           'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_commission_configs', 'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_cuisines',    'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_delivery_areas', 'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_delivery_companies', 'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_distance_based_delivery_fees', 'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_domains',     'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_locations',   'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_menu_cache',  'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_onboarding',  'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_payment_options', 'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_reviews',     'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_schedules',   'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_special_schedules', 'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_status_history', 'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_subdomains',  'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_tag_assignments', 'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_tag_associations', 'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('restaurant_twilio_config', 'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('platform_commission_reports', 'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('commission_weekly_snapshots', 'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('cart_sessions',          'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('order_refunds',          'restaurant_id', 'restaurant_uuid', 'restaurants');
SELECT _add_uuid_fk('statement_adjustments',  'restaurant_id', 'restaurant_uuid', 'restaurants');

-- ============================================================================
-- user_uuid — customer/user FK
-- ============================================================================
SELECT _add_uuid_fk('orders',                 'user_id', 'user_uuid', 'users');
SELECT _add_uuid_fk('payment_transactions',   'user_id', 'user_uuid', 'users');
SELECT _add_uuid_fk('user_addresses',         'user_id', 'user_uuid', 'users');
SELECT _add_uuid_fk('user_delivery_addresses','user_id', 'user_uuid', 'users');
SELECT _add_uuid_fk('user_payment_methods',   'user_id', 'user_uuid', 'users');
SELECT _add_uuid_fk('restaurant_reviews',     'user_id', 'user_uuid', 'users');
SELECT _add_uuid_fk('cart_sessions',          'user_id', 'user_uuid', 'users');
SELECT _add_uuid_fk('promotion_redemptions',  'user_id', 'user_uuid', 'users');

-- ============================================================================
-- dish_uuid — dish FK on menu/order tables
-- ============================================================================
SELECT _add_uuid_fk('order_items',            'dish_id', 'dish_uuid', 'dishes');
SELECT _add_uuid_fk('dish_prices',            'dish_id', 'dish_uuid', 'dishes');
SELECT _add_uuid_fk('dish_availability',      'dish_id', 'dish_uuid', 'dishes');
SELECT _add_uuid_fk('dish_combo_groups',      'dish_id', 'dish_uuid', 'dishes');
SELECT _add_uuid_fk('dish_modifier_groups',   'dish_id', 'dish_uuid', 'dishes');
SELECT _add_uuid_fk('dish_modifiers',         'dish_id', 'dish_uuid', 'dishes');
SELECT _add_uuid_fk('dish_modifier_prices',   'dish_id', 'dish_uuid', 'dishes');
SELECT _add_uuid_fk('combo_group_dish_selections', 'dish_id', 'dish_uuid', 'dishes');
SELECT _add_uuid_fk('promotion_targets',      'dish_id', 'dish_uuid', 'dishes');

-- ============================================================================
-- course_uuid — category FK on menu tables
-- ============================================================================
SELECT _add_uuid_fk('dishes',                 'course_id', 'course_uuid', 'courses');
SELECT _add_uuid_fk('course_modifier_templates', 'course_id', 'course_uuid', 'courses');
SELECT _add_uuid_fk('combo_group_dish_selections', 'course_id', 'course_uuid', 'courses');
SELECT _add_uuid_fk('promotion_targets',      'course_id', 'course_uuid', 'courses');

-- ============================================================================
-- order_uuid — order FK on sub-tables
-- ============================================================================
SELECT _add_uuid_fk('order_status_history',   'order_id', 'order_uuid', 'orders');
SELECT _add_uuid_fk('payment_transactions',   'order_id', 'order_uuid', 'orders');
SELECT _add_uuid_fk('order_refunds',          'order_id', 'order_uuid', 'orders');
SELECT _add_uuid_fk('promotion_redemptions',  'order_id', 'order_uuid', 'orders');

-- ============================================================================
-- combo_group_uuid — combo group FK
-- ============================================================================
SELECT _add_uuid_fk('combo_group_sections',   'combo_group_id', 'combo_group_uuid', 'combo_groups');
SELECT _add_uuid_fk('combo_group_dish_selections', 'combo_group_id', 'combo_group_uuid', 'combo_groups');
SELECT _add_uuid_fk('combo_group_translations', 'combo_group_id', 'combo_group_uuid', 'combo_groups');
SELECT _add_uuid_fk('dish_combo_groups',      'combo_group_id', 'combo_group_uuid', 'combo_groups');

-- ============================================================================
-- modifier_group_uuid — modifier group FK
-- ============================================================================
SELECT _add_uuid_fk('modifiers',              'modifier_group_id', 'modifier_group_uuid', 'modifier_groups');
SELECT _add_uuid_fk('dish_modifier_groups',   'modifier_group_id', 'modifier_group_uuid', 'modifier_groups');

-- ============================================================================
-- admin_user_uuid — admin FK on junction/audit tables
-- ============================================================================
SELECT _add_uuid_fk('admin_user_restaurants', 'admin_user_id', 'admin_user_uuid', 'admin_users');
SELECT _add_uuid_fk('admin_users',           'role_id', 'role_uuid', 'admin_roles');

-- ============================================================================
-- device_uuid — device FK
-- ============================================================================
SELECT _add_uuid_fk('device_configs',         'device_id', 'device_uuid', 'devices');
SELECT _add_uuid_fk('device_sessions',        'device_id', 'device_uuid', 'devices');

-- ============================================================================
-- Other entity-level FKs
-- ============================================================================
SELECT _add_uuid_fk('combo_modifier_groups',  'combo_group_section_id', 'combo_group_section_uuid', 'combo_group_sections');
SELECT _add_uuid_fk('combo_modifiers',        'combo_modifier_group_id', 'combo_modifier_group_uuid', 'combo_modifier_groups');
SELECT _add_uuid_fk('combo_modifier_prices',  'combo_modifier_id', 'combo_modifier_uuid', 'combo_modifiers');
SELECT _add_uuid_fk('combo_modifier_placements', 'combo_modifier_id', 'combo_modifier_uuid', 'combo_modifiers');
SELECT _add_uuid_fk('modifier_prices',        'modifier_id', 'modifier_uuid', 'modifiers');
SELECT _add_uuid_fk('dish_modifier_prices',   'dish_modifier_id', 'dish_modifier_uuid', 'dish_modifiers');
SELECT _add_uuid_fk('course_template_modifiers', 'template_id', 'template_uuid', 'course_modifier_templates');
SELECT _add_uuid_fk('promotion_codes',        'campaign_id', 'campaign_uuid', 'promotion_campaigns');
SELECT _add_uuid_fk('promotion_redemptions',  'campaign_id', 'campaign_uuid', 'promotion_campaigns');
SELECT _add_uuid_fk('promotion_targets',      'campaign_id', 'campaign_uuid', 'promotion_campaigns');
SELECT _add_uuid_fk('promotion_tiers',        'campaign_id', 'campaign_uuid', 'promotion_campaigns');
SELECT _add_uuid_fk('vendor_restaurants',     'vendor_id', 'vendor_uuid', 'vendors');
SELECT _add_uuid_fk('vendor_commission_reports', 'vendor_id', 'vendor_uuid', 'vendors');

-- ============================================================================
-- CLEANUP
-- ============================================================================
DROP FUNCTION _add_uuid_fk(TEXT, TEXT, TEXT, TEXT);

-- ============================================================================
-- SKIPPED (intentionally)
-- ============================================================================
-- created_by, updated_by, deleted_by -> admin_users.id (audit metadata, not entity refs)
-- province_id, city_id -> provinces/cities (static lookup tables, no uuid)
-- coupon_usage_log FKs (internal log table)
-- autologin_tokens, password_reset_tokens (ephemeral auth)
-- user_favorite_restaurants (simple junction table)
-- order_items partitions (inherit from parent)
-- vendor_invoices, vendor_restaurant_assignments -> vendor_configs (internal config)
-- ============================================================================
