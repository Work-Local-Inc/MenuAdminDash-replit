-- ============================================================================
-- Migration 017: Add UUID Columns (Phase 1)
-- ============================================================================
-- Purpose: Add UUID columns to all tables that don't have them yet.
--          This is a non-breaking change — integer PKs and FKs are untouched.
--          UUIDs will be used as external-facing identifiers in APIs/URLs.
--
-- Database: Neon PostgreSQL (menuca_v3 schema)
-- Run with: psql "$SUPABASE_BRANCH_DB_URL" -f migrations/017_add_uuid_columns.sql
--
-- Tables already with uuid: restaurants, restaurant_locations,
--   restaurant_domains, restaurant_schedules, delivery_and_pickup_configs,
--   courses, dishes, dish_modifiers, dish_modifier_prices, orders, devices,
--   combo_group_modifier_pricing, combo_group_translations,
--   delivery_company_emails, delivery_providers, promotion_campaigns,
--   promotion_codes, promotion_redemptions, restaurant_delivery_areas,
--   restaurant_delivery_companies, restaurant_distance_based_delivery_fees,
--   restaurant_special_schedules, restaurant_twilio_config, upsell_rules
--
-- Strategy:
--   1. Add uuid column with default gen_random_uuid()
--   2. Backfill any existing rows
--   3. Add UNIQUE index for lookups
--
-- Each table is a separate DO block so one failure won't roll back the rest.
-- Safe to run multiple times (IF NOT EXISTS everywhere).
-- ============================================================================

SET search_path TO menuca_v3;

-- Helper: reusable function to add uuid column to any table
CREATE OR REPLACE FUNCTION _add_uuid_column(p_table TEXT) RETURNS void AS $$
BEGIN
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS uuid UUID', p_table);
    EXECUTE format('UPDATE %I SET uuid = gen_random_uuid() WHERE uuid IS NULL', p_table);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN uuid SET DEFAULT gen_random_uuid()', p_table);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN uuid SET NOT NULL', p_table);
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS idx_%s_uuid ON %I(uuid)', p_table, p_table);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USERS & ACCESS CONTROL
-- ============================================================================
SELECT _add_uuid_column('users');
SELECT _add_uuid_column('admin_users');
SELECT _add_uuid_column('admin_user_restaurants');
SELECT _add_uuid_column('admin_roles');
SELECT _add_uuid_column('user_addresses');
SELECT _add_uuid_column('user_delivery_addresses');
SELECT _add_uuid_column('user_payment_methods');

-- ============================================================================
-- MENU & CATALOG
-- ============================================================================
SELECT _add_uuid_column('combo_groups');
SELECT _add_uuid_column('dish_prices');
SELECT _add_uuid_column('dish_size_variants');

-- ============================================================================
-- COMBO MODIFIER SYSTEM
-- ============================================================================
SELECT _add_uuid_column('combo_group_sections');
SELECT _add_uuid_column('combo_group_dish_selections');
SELECT _add_uuid_column('combo_modifier_groups');
SELECT _add_uuid_column('combo_modifiers');
SELECT _add_uuid_column('combo_modifier_prices');
SELECT _add_uuid_column('combo_modifier_placements');
SELECT _add_uuid_column('combo_steps');
SELECT _add_uuid_column('dish_combo_groups');

-- ============================================================================
-- MENU BUILDER / MODIFIER SYSTEM
-- ============================================================================
SELECT _add_uuid_column('course_modifier_templates');
SELECT _add_uuid_column('course_template_modifiers');
SELECT _add_uuid_column('dish_modifier_groups');
SELECT _add_uuid_column('modifier_groups');
SELECT _add_uuid_column('modifiers');
SELECT _add_uuid_column('modifier_prices');
SELECT _add_uuid_column('modifier_size_variants');
SELECT _add_uuid_column('modifier_group_details');

-- ============================================================================
-- ORDERS & PAYMENTS
-- ============================================================================
SELECT _add_uuid_column('order_items');
SELECT _add_uuid_column('order_status_history');
SELECT _add_uuid_column('order_refunds');
SELECT _add_uuid_column('payment_transactions');

-- ============================================================================
-- MARKETING & PROMOTIONS
-- ============================================================================
SELECT _add_uuid_column('promotional_deals');
SELECT _add_uuid_column('promotional_coupons');
SELECT _add_uuid_column('promotion_targets');
SELECT _add_uuid_column('promotion_templates');
SELECT _add_uuid_column('promotion_tiers');
SELECT _add_uuid_column('flash_sale_claims');

-- ============================================================================
-- RESTAURANT SUB-TABLES
-- ============================================================================
SELECT _add_uuid_column('restaurant_reviews');
SELECT _add_uuid_column('restaurant_payment_options');
SELECT _add_uuid_column('restaurant_subdomains');
SELECT _add_uuid_column('restaurant_commission_configs');
SELECT _add_uuid_column('restaurant_onboarding');
SELECT _add_uuid_column('restaurant_status_history');
SELECT _add_uuid_column('restaurant_analytics_configs');
SELECT _add_uuid_column('restaurant_menu_cache');
SELECT _add_uuid_column('restaurant_cuisines');
SELECT _add_uuid_column('restaurant_tags');
SELECT _add_uuid_column('restaurant_tag_assignments');
SELECT _add_uuid_column('restaurant_tag_associations');
SELECT _add_uuid_column('restaurant_ownership_groups');
SELECT _add_uuid_column('restaurant_group_memberships');
SELECT _add_uuid_column('dish_availability');

-- ============================================================================
-- VENDOR / COMMISSION SYSTEM
-- ============================================================================
SELECT _add_uuid_column('vendors');
SELECT _add_uuid_column('vendor_restaurants');
SELECT _add_uuid_column('vendor_restaurant_assignments');
SELECT _add_uuid_column('vendor_configs');
SELECT _add_uuid_column('vendor_invoices');
SELECT _add_uuid_column('vendor_commission_reports');
SELECT _add_uuid_column('vendor_statement_numbers');
SELECT _add_uuid_column('statement_adjustments');
SELECT _add_uuid_column('commission_weekly_snapshots');
SELECT _add_uuid_column('platform_commission_reports');

-- ============================================================================
-- DEVICE MANAGEMENT
-- ============================================================================
SELECT _add_uuid_column('device_configs');
SELECT _add_uuid_column('device_sessions');
SELECT _add_uuid_column('tablet_app_versions');

-- ============================================================================
-- CLEANUP: Drop the helper function
-- ============================================================================
DROP FUNCTION _add_uuid_column(TEXT);

-- ============================================================================
-- TABLES INTENTIONALLY SKIPPED (internal infrastructure / logs / static data)
-- ============================================================================
-- provinces             — static reference data
-- cities                — static reference data
-- cuisine_types         — static reference data
-- province_tax_config   — static reference data
-- same_name_terms       — static lookup
-- translation_lookup    — static lookup
-- marketing_tags        — static lookup
-- audit_log             — internal log (partitioned)
-- admin_audit_log       — internal log
-- rate_limits           — internal infrastructure
-- email_queue           — internal job queue
-- failed_jobs           — internal job queue
-- coupon_usage_log      — internal log
-- stripe_webhook_events — internal Stripe event log
-- cart_sessions         — already has session_id UUID
-- user_favorite_restaurants — junction table
-- password_reset_tokens — ephemeral auth tokens
-- autologin_tokens      — ephemeral auth tokens
-- order_items partitions (orders_20XX_XX, order_items_20XX_XX) — inherit from parent
-- ============================================================================
