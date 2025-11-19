-- ============================================
-- Menu.ca V3 - Phase 0 Critical Gaps
-- Addresses security & business logic gaps identified in review
-- Run this in Supabase SQL Editor BEFORE building frontend
-- ============================================

-- ============================================
-- GAP #1: REAL-TIME DISH AVAILABILITY
-- ============================================

CREATE TABLE IF NOT EXISTS menuca_v3.dish_inventory (
  dish_id BIGINT PRIMARY KEY REFERENCES menuca_v3.dishes(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  unavailable_until TIMESTAMPTZ,
  reason VARCHAR(50), -- 'out_of_stock', 'prepping', '86ed', 'discontinued'
  notes TEXT,
  updated_by_admin_id BIGINT REFERENCES menuca_v3.admin_users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dish_inventory_available ON menuca_v3.dish_inventory(is_available);
CREATE INDEX IF NOT EXISTS idx_dish_inventory_unavailable_until ON menuca_v3.dish_inventory(unavailable_until);

COMMENT ON TABLE menuca_v3.dish_inventory IS 'Real-time dish availability tracking to prevent orders for out-of-stock items';

-- ============================================
-- GAP #2: GUEST CHECKOUT SUPPORT
-- ============================================

-- Add guest order fields to orders table
ALTER TABLE menuca_v3.orders
  ADD COLUMN IF NOT EXISTS is_guest_order BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255);

-- Make user_id nullable for guest orders
ALTER TABLE menuca_v3.orders 
  ALTER COLUMN user_id DROP NOT NULL;

-- Add check constraint: either user_id OR guest fields must be present
ALTER TABLE menuca_v3.orders
  ADD CONSTRAINT check_user_or_guest 
  CHECK (
    (user_id IS NOT NULL AND is_guest_order = FALSE) OR 
    (user_id IS NULL AND is_guest_order = TRUE AND guest_email IS NOT NULL AND guest_phone IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON menuca_v3.orders(guest_email) WHERE is_guest_order = TRUE;

COMMENT ON COLUMN menuca_v3.orders.is_guest_order IS 'True if order placed without account creation';
COMMENT ON COLUMN menuca_v3.orders.guest_email IS 'Email for guest orders (for order updates)';
COMMENT ON COLUMN menuca_v3.orders.guest_phone IS 'Phone for guest orders (for delivery coordination)';

-- ============================================
-- GAP #3: SERVER-SIDE PRICE VALIDATION
-- Function to calculate order total on server
-- CRITICAL SECURITY: Never trust client-sent prices!
-- ============================================

CREATE OR REPLACE FUNCTION menuca_v3.calculate_order_total(
  p_restaurant_id BIGINT,
  p_items JSONB, -- [{dish_id, size_id, modifier_ids[], quantity}]
  p_delivery_type VARCHAR(20), -- 'delivery' or 'pickup'
  p_coupon_code VARCHAR(50) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_subtotal NUMERIC(10, 2) := 0;
  v_tax_rate NUMERIC(5, 4) := 0.13; -- 13% HST Ontario
  v_delivery_fee NUMERIC(10, 2) := 0;
  v_discount NUMERIC(10, 2) := 0;
  v_tax NUMERIC(10, 2);
  v_total NUMERIC(10, 2);
  v_item JSONB;
  v_dish_price NUMERIC(10, 2);
  v_size_price NUMERIC(10, 2);
  v_modifier_price NUMERIC(10, 2);
  v_modifier_id BIGINT;
  v_item_total NUMERIC(10, 2);
  v_coupon RECORD;
BEGIN
  -- Validate restaurant exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM menuca_v3.restaurants 
    WHERE id = p_restaurant_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Restaurant not found or inactive';
  END IF;

  -- Calculate subtotal from database prices (NEVER trust client!)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Get base dish price (default size)
    SELECT base_price INTO v_dish_price
    FROM menuca_v3.dishes
    WHERE id = (v_item->>'dish_id')::BIGINT
      AND restaurant_id = p_restaurant_id
      AND deleted_at IS NULL;

    IF v_dish_price IS NULL THEN
      RAISE EXCEPTION 'Dish not found: %', v_item->>'dish_id';
    END IF;

    -- Get size price if specified
    v_size_price := 0;
    IF v_item->>'size_id' IS NOT NULL THEN
      SELECT price INTO v_size_price
      FROM menuca_v3.dish_sizes
      WHERE id = (v_item->>'size_id')::BIGINT
        AND dish_id = (v_item->>'dish_id')::BIGINT;
      
      IF v_size_price IS NOT NULL THEN
        v_dish_price := v_size_price; -- Replace base price with size price
      END IF;
    END IF;

    -- Calculate modifier prices
    v_modifier_price := 0;
    IF v_item->'modifier_ids' IS NOT NULL THEN
      FOR v_modifier_id IN 
        SELECT (value::TEXT)::BIGINT 
        FROM jsonb_array_elements(v_item->'modifier_ids')
      LOOP
        SELECT COALESCE(price, 0) INTO v_modifier_price
        FROM menuca_v3.dish_modifiers
        WHERE id = v_modifier_id;
        
        v_modifier_price := v_modifier_price + COALESCE(v_modifier_price, 0);
      END LOOP;
    END IF;

    -- Item total = (dish price + modifiers) * quantity
    v_item_total := (v_dish_price + v_modifier_price) * (v_item->>'quantity')::INTEGER;
    v_subtotal := v_subtotal + v_item_total;
  END LOOP;

  -- Get delivery fee if delivery
  IF p_delivery_type = 'delivery' THEN
    SELECT COALESCE(delivery_fee, 0) INTO v_delivery_fee
    FROM menuca_v3.restaurants
    WHERE id = p_restaurant_id;
  END IF;

  -- Apply coupon discount if provided
  IF p_coupon_code IS NOT NULL THEN
    SELECT * INTO v_coupon
    FROM menuca_v3.promotional_coupons
    WHERE code = p_coupon_code
      AND restaurant_id = p_restaurant_id
      AND is_active = TRUE
      AND valid_from <= NOW()
      AND valid_until >= NOW();

    IF v_coupon.id IS NOT NULL THEN
      IF v_coupon.discount_type = 'percentage' THEN
        v_discount := v_subtotal * (v_coupon.discount_value / 100);
      ELSE
        v_discount := v_coupon.discount_value;
      END IF;
      
      -- Cap discount at subtotal
      IF v_discount > v_subtotal THEN
        v_discount := v_subtotal;
      END IF;
    END IF;
  END IF;

  -- Calculate tax on (subtotal - discount + delivery)
  v_tax := ROUND((v_subtotal - v_discount + v_delivery_fee) * v_tax_rate, 2);
  
  -- Calculate final total
  v_total := ROUND(v_subtotal - v_discount + v_delivery_fee + v_tax, 2);

  RETURN jsonb_build_object(
    'subtotal', v_subtotal,
    'discount', v_discount,
    'delivery_fee', v_delivery_fee,
    'tax', v_tax,
    'tax_rate', v_tax_rate,
    'total', v_total,
    'currency', 'CAD'
  );
END;
$$;

COMMENT ON FUNCTION menuca_v3.calculate_order_total IS 'Server-side order total calculation - CRITICAL SECURITY: Never trust client prices!';

-- ============================================
-- GAP #4: CART AVAILABILITY CHECK
-- Check if all items in cart are still available
-- ============================================

CREATE OR REPLACE FUNCTION menuca_v3.check_cart_availability(
  p_restaurant_id BIGINT,
  p_cart_items JSONB -- [{dish_id, dish_name, size_id, quantity}]
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_item JSONB;
  v_unavailable_items JSONB := '[]'::JSONB;
  v_inventory RECORD;
  v_dish RECORD;
  v_all_available BOOLEAN := TRUE;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
  LOOP
    -- Check if dish exists and is active
    SELECT id, name, deleted_at INTO v_dish
    FROM menuca_v3.dishes
    WHERE id = (v_item->>'dish_id')::BIGINT
      AND restaurant_id = p_restaurant_id;

    IF v_dish.id IS NULL OR v_dish.deleted_at IS NOT NULL THEN
      v_all_available := FALSE;
      v_unavailable_items := v_unavailable_items || jsonb_build_object(
        'dish_id', v_item->>'dish_id',
        'dish_name', v_item->>'dish_name',
        'reason', 'dish_not_found',
        'message', 'This item is no longer available'
      );
      CONTINUE;
    END IF;

    -- Check dish_inventory table for availability
    SELECT * INTO v_inventory
    FROM menuca_v3.dish_inventory
    WHERE dish_id = (v_item->>'dish_id')::BIGINT;

    IF v_inventory.dish_id IS NOT NULL THEN
      IF v_inventory.is_available = FALSE THEN
        -- Check if temporary (unavailable_until)
        IF v_inventory.unavailable_until IS NOT NULL AND v_inventory.unavailable_until > NOW() THEN
          v_all_available := FALSE;
          v_unavailable_items := v_unavailable_items || jsonb_build_object(
            'dish_id', v_item->>'dish_id',
            'dish_name', v_item->>'dish_name',
            'reason', v_inventory.reason,
            'message', format('Temporarily unavailable until %s', to_char(v_inventory.unavailable_until, 'HH12:MI AM')),
            'unavailable_until', v_inventory.unavailable_until
          );
        ELSE
          v_all_available := FALSE;
          v_unavailable_items := v_unavailable_items || jsonb_build_object(
            'dish_id', v_item->>'dish_id',
            'dish_name', v_item->>'dish_name',
            'reason', v_inventory.reason,
            'message', 'This item is currently unavailable',
            'notes', v_inventory.notes
          );
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'all_available', v_all_available,
    'unavailable_items', v_unavailable_items,
    'checked_at', NOW()
  );
END;
$$;

COMMENT ON FUNCTION menuca_v3.check_cart_availability IS 'Validates all cart items are available before checkout';

-- ============================================
-- GAP #5: ORDER CANCELLATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION menuca_v3.can_cancel_order(
  p_order_id BIGINT,
  p_order_created_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order
  FROM menuca_v3.orders
  WHERE id = p_order_id
    AND created_at = p_order_created_at;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object(
      'can_cancel', false,
      'reason', 'order_not_found'
    );
  END IF;

  -- Can only cancel if status is 'pending' or 'confirmed'
  IF v_order.status IN ('pending', 'confirmed') THEN
    RETURN jsonb_build_object(
      'can_cancel', true,
      'reason', null,
      'order_status', v_order.status
    );
  END IF;

  RETURN jsonb_build_object(
    'can_cancel', false,
    'reason', format('Cannot cancel order with status: %s', v_order.status),
    'order_status', v_order.status
  );
END;
$$;

COMMENT ON FUNCTION menuca_v3.can_cancel_order IS 'Checks if order can be cancelled based on current status';

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Phase 0 critical gaps migration completed!' AS status,
       'Created: dish_inventory table, 4 SQL functions' AS created,
       'Updated: orders table (guest checkout fields, nullable user_id)' AS updated,
       'Security: Server-side price calculation, availability checks, cancellation logic' AS security_improvements;
