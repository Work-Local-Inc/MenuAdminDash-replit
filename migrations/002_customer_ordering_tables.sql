-- ============================================
-- Menu.ca V3 - Customer Ordering System Tables
-- Run this in Supabase SQL Editor
-- Adds 8 new tables for customer ordering functionality
-- ============================================

-- 1. CART SESSIONS (Temporary cart storage)
CREATE TABLE IF NOT EXISTS menuca_v3.cart_sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES menuca_v3.users(id),
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  cart_data JSONB NOT NULL, -- {items: [...], subtotal: 0, tax: 0}
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_sessions_session_id ON menuca_v3.cart_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_sessions_user ON menuca_v3.cart_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_sessions_expires ON menuca_v3.cart_sessions(expires_at);

-- 2. USER DELIVERY ADDRESSES (Saved addresses)
CREATE TABLE IF NOT EXISTS menuca_v3.user_delivery_addresses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES menuca_v3.users(id),
  address_label VARCHAR(50), -- 'Home', 'Work', etc.
  street_address VARCHAR(500) NOT NULL,
  unit VARCHAR(50),
  city_id BIGINT NOT NULL REFERENCES menuca_v3.cities(id),
  postal_code VARCHAR(20) NOT NULL,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  delivery_instructions TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, address_label)
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON menuca_v3.user_delivery_addresses(user_id);

-- 3. USER SAVED PAYMENT METHODS (Stripe)
CREATE TABLE IF NOT EXISTS menuca_v3.user_payment_methods (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES menuca_v3.users(id),
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
  card_brand VARCHAR(50), -- 'visa', 'mastercard', 'amex'
  last_4_digits VARCHAR(4),
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON menuca_v3.user_payment_methods(user_id);

-- 4. PAYMENT TRANSACTIONS (Payment tracking)
CREATE TABLE IF NOT EXISTS menuca_v3.payment_transactions (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  order_created_at TIMESTAMPTZ NOT NULL,
  user_id BIGINT NOT NULL REFERENCES menuca_v3.users(id),
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_charge_id VARCHAR(255),
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'CAD',
  status VARCHAR(50) NOT NULL, -- 'pending', 'succeeded', 'failed', 'refunded'
  payment_method VARCHAR(50),
  failure_reason TEXT,
  refund_amount NUMERIC(10, 2) DEFAULT 0,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON menuca_v3.payment_transactions(order_id, order_created_at);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe ON menuca_v3.payment_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON menuca_v3.payment_transactions(user_id);

-- 5. ORDER STATUS HISTORY (Order tracking)
CREATE TABLE IF NOT EXISTS menuca_v3.order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  order_created_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_history_order ON menuca_v3.order_status_history(order_id, order_created_at);
CREATE INDEX IF NOT EXISTS idx_order_history_status ON menuca_v3.order_status_history(status);

-- 6. STRIPE WEBHOOK EVENTS (Idempotency)
CREATE TABLE IF NOT EXISTS menuca_v3.stripe_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON menuca_v3.stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON menuca_v3.stripe_webhook_events(processed);

-- 7. CUSTOMER FAVORITES
CREATE TABLE IF NOT EXISTS menuca_v3.user_favorite_dishes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES menuca_v3.users(id),
  dish_id BIGINT NOT NULL REFERENCES menuca_v3.dishes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, dish_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON menuca_v3.user_favorite_dishes(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_dish ON menuca_v3.user_favorite_dishes(dish_id);

-- 8. RESTAURANT REVIEWS (If not exists)
CREATE TABLE IF NOT EXISTS menuca_v3.restaurant_reviews (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  user_id BIGINT NOT NULL REFERENCES menuca_v3.users(id),
  order_id BIGINT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON menuca_v3.restaurant_reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON menuca_v3.restaurant_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON menuca_v3.restaurant_reviews(rating);

-- ============================================
-- UPDATE EXISTING TABLES
-- ============================================

-- Add Stripe customer ID to users table
ALTER TABLE menuca_v3.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;

-- Add payment fields to orders table  
ALTER TABLE menuca_v3.orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS delivery_address JSONB,
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_delivery_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_delivery_time TIMESTAMPTZ;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Customer ordering tables created successfully!' AS status,
       'Created: cart_sessions, user_delivery_addresses, user_payment_methods, payment_transactions, order_status_history, stripe_webhook_events, user_favorite_dishes, restaurant_reviews' AS tables_created,
       'Updated: users (stripe_customer_id), orders (payment fields)' AS tables_updated;
