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
--   restaurant_contacts, restaurant_domains, restaurant_schedules,
--   delivery_and_pickup_configs, courses, dishes, ingredients,
--   ingredient_groups, ingredient_group_items, combo_groups, combo_items,
--   dish_modifiers, orders, devices
--
-- Strategy:
--   1. Add uuid column with default gen_random_uuid()
--   2. Backfill any existing rows
--   3. Add UNIQUE index for lookups
--
-- Safe to run multiple times (IF NOT EXISTS everywhere).
-- ============================================================================

SET search_path TO menuca_v3;

BEGIN;

-- ============================================================================
-- USERS & ACCESS CONTROL
-- ============================================================================

-- users
ALTER TABLE users ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE users SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE users ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE users ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);

-- admin_users
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE admin_users SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE admin_users ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE admin_users ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_uuid ON admin_users(uuid);

-- admin_user_restaurants
ALTER TABLE admin_user_restaurants ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE admin_user_restaurants SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE admin_user_restaurants ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE admin_user_restaurants ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_user_restaurants_uuid ON admin_user_restaurants(uuid);

-- admin_roles
ALTER TABLE admin_roles ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE admin_roles SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE admin_roles ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE admin_roles ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_roles_uuid ON admin_roles(uuid);

-- user_addresses
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE user_addresses SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE user_addresses ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE user_addresses ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_addresses_uuid ON user_addresses(uuid);

-- user_delivery_addresses
ALTER TABLE user_delivery_addresses ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE user_delivery_addresses SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE user_delivery_addresses ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE user_delivery_addresses ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_delivery_addresses_uuid ON user_delivery_addresses(uuid);

-- user_payment_methods
ALTER TABLE user_payment_methods ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE user_payment_methods SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE user_payment_methods ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE user_payment_methods ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_payment_methods_uuid ON user_payment_methods(uuid);

-- ============================================================================
-- MENU & CATALOG
-- ============================================================================

-- dish_prices
ALTER TABLE dish_prices ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE dish_prices SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE dish_prices ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE dish_prices ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dish_prices_uuid ON dish_prices(uuid);

-- dish_modifier_prices
ALTER TABLE dish_modifier_prices ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE dish_modifier_prices SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE dish_modifier_prices ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE dish_modifier_prices ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dish_modifier_prices_uuid ON dish_modifier_prices(uuid);

-- ============================================================================
-- COMBO MODIFIER SYSTEM
-- ============================================================================

-- combo_group_sections
ALTER TABLE combo_group_sections ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE combo_group_sections SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE combo_group_sections ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE combo_group_sections ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_combo_group_sections_uuid ON combo_group_sections(uuid);

-- combo_modifier_groups
ALTER TABLE combo_modifier_groups ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE combo_modifier_groups SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE combo_modifier_groups ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE combo_modifier_groups ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_combo_modifier_groups_uuid ON combo_modifier_groups(uuid);

-- combo_modifiers
ALTER TABLE combo_modifiers ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE combo_modifiers SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE combo_modifiers ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE combo_modifiers ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_combo_modifiers_uuid ON combo_modifiers(uuid);

-- combo_modifier_prices
ALTER TABLE combo_modifier_prices ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE combo_modifier_prices SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE combo_modifier_prices ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE combo_modifier_prices ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_combo_modifier_prices_uuid ON combo_modifier_prices(uuid);

-- combo_modifier_placements
ALTER TABLE combo_modifier_placements ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE combo_modifier_placements SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE combo_modifier_placements ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE combo_modifier_placements ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_combo_modifier_placements_uuid ON combo_modifier_placements(uuid);

-- dish_combo_groups
ALTER TABLE dish_combo_groups ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE dish_combo_groups SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE dish_combo_groups ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE dish_combo_groups ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dish_combo_groups_uuid ON dish_combo_groups(uuid);

-- ============================================================================
-- MENU BUILDER SYSTEM (Migration 008+)
-- ============================================================================

-- course_modifier_templates
ALTER TABLE course_modifier_templates ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE course_modifier_templates SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE course_modifier_templates ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE course_modifier_templates ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_modifier_templates_uuid ON course_modifier_templates(uuid);

-- course_template_modifiers
ALTER TABLE course_template_modifiers ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE course_template_modifiers SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE course_template_modifiers ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE course_template_modifiers ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_template_modifiers_uuid ON course_template_modifiers(uuid);

-- dish_modifier_groups (from migration 008)
ALTER TABLE dish_modifier_groups ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE dish_modifier_groups SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE dish_modifier_groups ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE dish_modifier_groups ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dish_modifier_groups_uuid ON dish_modifier_groups(uuid);

-- ============================================================================
-- ORDERS & PAYMENTS
-- ============================================================================

-- order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE order_items SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE order_items ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE order_items ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_items_uuid ON order_items(uuid);

-- order_item_modifiers
ALTER TABLE order_item_modifiers ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE order_item_modifiers SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE order_item_modifiers ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE order_item_modifiers ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_item_modifiers_uuid ON order_item_modifiers(uuid);

-- payment_transactions
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE payment_transactions SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE payment_transactions ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE payment_transactions ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_transactions_uuid ON payment_transactions(uuid);

-- order_status_history
ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE order_status_history SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE order_status_history ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE order_status_history ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_status_history_uuid ON order_status_history(uuid);

-- ============================================================================
-- MARKETING & PROMOTIONS
-- ============================================================================

-- promotional_deals
ALTER TABLE promotional_deals ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE promotional_deals SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE promotional_deals ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE promotional_deals ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_promotional_deals_uuid ON promotional_deals(uuid);

-- promotional_coupons
ALTER TABLE promotional_coupons ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE promotional_coupons SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE promotional_coupons ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE promotional_coupons ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_promotional_coupons_uuid ON promotional_coupons(uuid);

-- ============================================================================
-- RESTAURANT SUB-TABLES (ones missing uuid)
-- ============================================================================

-- restaurant_feedback
ALTER TABLE restaurant_feedback ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE restaurant_feedback SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE restaurant_feedback ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE restaurant_feedback ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_feedback_uuid ON restaurant_feedback(uuid);

-- restaurant_custom_css
ALTER TABLE restaurant_custom_css ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE restaurant_custom_css SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE restaurant_custom_css ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE restaurant_custom_css ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_custom_css_uuid ON restaurant_custom_css(uuid);

-- restaurant_bank_accounts
ALTER TABLE restaurant_bank_accounts ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE restaurant_bank_accounts SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE restaurant_bank_accounts ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE restaurant_bank_accounts ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_bank_accounts_uuid ON restaurant_bank_accounts(uuid);

-- restaurant_payment_methods
ALTER TABLE restaurant_payment_methods ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE restaurant_payment_methods SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE restaurant_payment_methods ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE restaurant_payment_methods ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_payment_methods_uuid ON restaurant_payment_methods(uuid);

-- restaurant_redirects
ALTER TABLE restaurant_redirects ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE restaurant_redirects SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE restaurant_redirects ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE restaurant_redirects ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_redirects_uuid ON restaurant_redirects(uuid);

-- restaurant_charges
ALTER TABLE restaurant_charges ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE restaurant_charges SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE restaurant_charges ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE restaurant_charges ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_charges_uuid ON restaurant_charges(uuid);

-- restaurant_images
ALTER TABLE restaurant_images ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE restaurant_images SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE restaurant_images ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE restaurant_images ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_images_uuid ON restaurant_images(uuid);

-- restaurant_banners
ALTER TABLE restaurant_banners ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE restaurant_banners SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE restaurant_banners ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE restaurant_banners ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_banners_uuid ON restaurant_banners(uuid);

-- restaurant_citations
ALTER TABLE restaurant_citations ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE restaurant_citations SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE restaurant_citations ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE restaurant_citations ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_citations_uuid ON restaurant_citations(uuid);

-- ============================================================================
-- FRANCHISE & BUSINESS
-- ============================================================================

-- franchises
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE franchises SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE franchises ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE franchises ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_franchises_uuid ON franchises(uuid);

-- franchise_commission_rules
ALTER TABLE franchise_commission_rules ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE franchise_commission_rules SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE franchise_commission_rules ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE franchise_commission_rules ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_franchise_commission_rules_uuid ON franchise_commission_rules(uuid);

-- blacklist
ALTER TABLE blacklist ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE blacklist SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE blacklist ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE blacklist ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_blacklist_uuid ON blacklist(uuid);

-- email_templates
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE email_templates SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE email_templates ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE email_templates ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_uuid ON email_templates(uuid);

-- order_cancellation_requests
ALTER TABLE order_cancellation_requests ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE order_cancellation_requests SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE order_cancellation_requests ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE order_cancellation_requests ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_cancellation_requests_uuid ON order_cancellation_requests(uuid);

-- dish_inventory
ALTER TABLE dish_inventory ADD COLUMN IF NOT EXISTS uuid UUID;
UPDATE dish_inventory SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE dish_inventory ALTER COLUMN uuid SET DEFAULT gen_random_uuid();
ALTER TABLE dish_inventory ALTER COLUMN uuid SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dish_inventory_uuid ON dish_inventory(uuid);

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this after to confirm all uuid columns exist:
-- psql "$SUPABASE_BRANCH_DB_URL" -c "
--   SELECT t.table_name,
--          CASE WHEN c.column_name IS NOT NULL THEN 'YES' ELSE 'NO' END as has_uuid
--   FROM information_schema.tables t
--   LEFT JOIN information_schema.columns c
--       ON c.table_schema = t.table_schema
--       AND c.table_name = t.table_name
--       AND c.column_name = 'uuid'
--   WHERE t.table_schema = 'menuca_v3'
--       AND t.table_type = 'BASE TABLE'
--   ORDER BY has_uuid DESC, t.table_name;
-- "

-- ============================================================================
-- TABLES INTENTIONALLY SKIPPED (internal infrastructure / logs / static data)
-- ============================================================================
-- provinces          — static reference data, no external exposure
-- cities             — static reference data, no external exposure
-- audit_log          — internal logging, partitioned on created_at
-- rate_limits        — internal infrastructure
-- email_queue        — internal job queue
-- failed_jobs        — internal job queue
-- coupon_usage_log   — internal log (references parent UUIDs)
-- stripe_webhook_events — internal Stripe event log
-- cart_sessions      — already has session_id UUID
-- user_favorite_dishes — junction table (references parent UUIDs)
-- user_favorite_restaurants — junction table (references parent UUIDs)
-- restaurant_reviews — duplicate of restaurant_feedback
-- ============================================================================
