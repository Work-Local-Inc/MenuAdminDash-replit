# Marketing & Promotions Features

**Status:** ✅ 15/15 Complete | **Updated:** 2025-11-04

## Checklist
- [x] Feature 0: Translation Tables
- [x] Feature 1: Browse Restaurant Deals
- [x] Feature 2: Apply Coupons at Checkout
- [x] Feature 3: Auto-Apply Best Deal
- [x] Feature 4: Flash Sales
- [x] Feature 5: Filter Restaurants by Tags
- [x] Feature 6: View Available Coupons
- [x] Feature 7: Check Coupon Usage
- [x] Feature 8: Real-Time Deal Notifications
- [x] Feature 9: Create Promotional Deals
- [x] Feature 10: Manage Deal Status
- [x] Feature 11: View Deal Performance
- [x] Feature 12: Promotion Analytics Dashboard
- [x] Feature 13: Clone Deals to Multiple Locations
- [x] Feature 14: Soft Delete & Restore
- [x] Feature 15: Emergency Deal Shutoff

---

## FEATURE 0: Translation Tables

**Status:** ✅ | **Type:** Infrastructure | **Date:** 2025-10-29

### What It Does
Creates translation support for deals, coupons, and marketing tags in English, Spanish, and French with automatic fallback to English.

### SQL Code

**Tables:**
```sql
-- 3 Translation Tables
CREATE TABLE menuca_v3.promotional_deals_translations (
  id BIGSERIAL PRIMARY KEY,
  deal_id BIGINT REFERENCES menuca_v3.promotional_deals(id) ON DELETE CASCADE,
  language_code VARCHAR(2) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  terms_and_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, language_code)
);

CREATE TABLE menuca_v3.promotional_coupons_translations (
  id BIGSERIAL PRIMARY KEY,
  coupon_id BIGINT REFERENCES menuca_v3.promotional_coupons(id) ON DELETE CASCADE,
  language_code VARCHAR(2) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  terms_and_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coupon_id, language_code)
);

CREATE TABLE menuca_v3.marketing_tags_translations (
  id BIGSERIAL PRIMARY KEY,
  tag_id BIGINT REFERENCES menuca_v3.marketing_tags(id) ON DELETE CASCADE,
  language_code VARCHAR(2) NOT NULL,
  tag_name VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tag_id, language_code)
);

-- Indexes
CREATE INDEX idx_deals_translations_lookup ON menuca_v3.promotional_deals_translations(deal_id, language_code);
CREATE INDEX idx_deals_translations_language ON menuca_v3.promotional_deals_translations(language_code);
CREATE INDEX idx_coupons_translations_lookup ON menuca_v3.promotional_coupons_translations(coupon_id, language_code);
CREATE INDEX idx_coupons_translations_language ON menuca_v3.promotional_coupons_translations(language_code);
CREATE INDEX idx_tags_translations_lookup ON menuca_v3.marketing_tags_translations(tag_id, language_code);
CREATE INDEX idx_tags_translations_language ON menuca_v3.marketing_tags_translations(language_code);
```

### Verification

```sql
-- Check translations exist
SELECT * FROM menuca_v3.promotional_deals_translations WHERE deal_id = 240;
SELECT * FROM menuca_v3.marketing_tags_translations WHERE tag_id = 36;

-- Verify unique constraints
SELECT deal_id, language_code, COUNT(*)
FROM menuca_v3.promotional_deals_translations
GROUP BY deal_id, language_code
HAVING COUNT(*) > 1;
```

---

## FEATURE 1: Browse Restaurant Deals

**Status:** ✅ | **Type:** Customer | **Date:** 2025-10-29

### What It Does
Get all active deals for a restaurant with multi-language support and service type filtering.

### SQL Code

```sql
CREATE OR REPLACE FUNCTION menuca_v3.is_deal_active_now(p_deal_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_active BOOLEAN;
BEGIN
    SELECT (
        is_enabled = TRUE
        AND (date_start IS NULL OR date_start <= NOW())
        AND (date_stop IS NULL OR date_stop >= NOW())
        AND (disabled_at IS NULL)
    )
    INTO v_is_active
    FROM menuca_v3.promotional_deals
    WHERE id = p_deal_id;

    RETURN COALESCE(v_is_active, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.get_deal_with_translation(
    p_deal_id BIGINT,
    p_language VARCHAR DEFAULT 'en'
)
RETURNS TABLE(
    deal_id BIGINT,
    name VARCHAR,
    description TEXT,
    terms_and_conditions TEXT,
    language_code VARCHAR,
    discount_percent NUMERIC,
    discount_amount NUMERIC,
    minimum_purchase NUMERIC,
    date_start TIMESTAMPTZ,
    date_stop TIMESTAMPTZ,
    is_enabled BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        COALESCE(dt.title, d.name)::VARCHAR,
        COALESCE(dt.description, d.description),
        COALESCE(dt.terms_and_conditions, d.terms_and_conditions),
        COALESCE(dt.language_code, 'en')::VARCHAR,
        d.discount_percent,
        d.discount_amount,
        d.minimum_purchase,
        d.date_start,
        d.date_stop,
        d.is_enabled
    FROM menuca_v3.promotional_deals d
    LEFT JOIN menuca_v3.promotional_deals_translations dt
        ON d.id = dt.deal_id AND dt.language_code = p_language
    WHERE d.id = p_deal_id;
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.get_deals_i18n(
    p_restaurant_id BIGINT,
    p_language VARCHAR DEFAULT 'en',
    p_service_type VARCHAR DEFAULT NULL
)
RETURNS TABLE(
    deal_id BIGINT,
    name VARCHAR,
    description TEXT,
    terms_and_conditions TEXT,
    language_code VARCHAR,
    discount_percent NUMERIC,
    discount_amount NUMERIC,
    minimum_purchase NUMERIC,
    date_start TIMESTAMPTZ,
    date_stop TIMESTAMPTZ,
    availability_types JSONB,
    display_order INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        COALESCE(dt.title, d.name)::VARCHAR,
        COALESCE(dt.description, d.description),
        COALESCE(dt.terms_and_conditions, d.terms_and_conditions),
        COALESCE(dt.language_code, 'en')::VARCHAR,
        d.discount_percent,
        d.discount_amount,
        d.minimum_purchase,
        d.date_start,
        d.date_stop,
        d.availability_types,
        d.display_order
    FROM menuca_v3.promotional_deals d
    LEFT JOIN menuca_v3.promotional_deals_translations dt
        ON d.id = dt.deal_id AND dt.language_code = p_language
    WHERE d.restaurant_id = p_restaurant_id
        AND menuca_v3.is_deal_active_now(d.id) = TRUE
        AND (p_service_type IS NULL OR d.availability_types @> jsonb_build_array(p_service_type))
    ORDER BY d.display_order ASC, d.created_at DESC;
END;
$$;
```

### Verification

```sql
-- Test single deal
SELECT * FROM menuca_v3.get_deal_with_translation(240, 'es');

-- Test all deals for restaurant
SELECT deal_id, name, language_code FROM menuca_v3.get_deals_i18n(18, 'en', 'delivery');

-- Check active status
SELECT menuca_v3.is_deal_active_now(240);
```

### API
- `GET /api/restaurants/:id/deals?lang=es&service_type=delivery`

---

## FEATURE 2: Apply Coupons at Checkout

**Status:** ✅ | **Type:** Customer | **Date:** 2025-10-29

### What It Does
Validates coupon codes and applies discounts at checkout with comprehensive error handling and usage limit tracking.

### SQL Code

```sql
CREATE OR REPLACE FUNCTION menuca_v3.validate_coupon(
    p_coupon_code VARCHAR,
    p_restaurant_id BIGINT,
    p_customer_id BIGINT,
    p_order_total NUMERIC,
    p_service_type VARCHAR DEFAULT NULL
)
RETURNS TABLE(
    valid BOOLEAN,
    error_code VARCHAR,
    discount_amount NUMERIC,
    coupon_id BIGINT,
    coupon_name VARCHAR,
    final_total NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_coupon RECORD;
    v_customer_used INTEGER;
    v_total_used INTEGER;
    v_discount NUMERIC;
BEGIN
    -- Get coupon details
    SELECT * INTO v_coupon
    FROM menuca_v3.promotional_coupons
    WHERE code = p_coupon_code;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'COUPON_NOT_FOUND'::VARCHAR, NULL::NUMERIC, NULL::BIGINT, NULL::VARCHAR, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Check if active
    IF v_coupon.is_active = FALSE THEN
        RETURN QUERY SELECT FALSE, 'COUPON_INACTIVE'::VARCHAR, NULL::NUMERIC, NULL::BIGINT, NULL::VARCHAR, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Check expiry
    IF v_coupon.valid_until_at < NOW() OR v_coupon.valid_from_at > NOW() THEN
        RETURN QUERY SELECT FALSE, 'COUPON_EXPIRED'::VARCHAR, NULL::NUMERIC, NULL::BIGINT, NULL::VARCHAR, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Check restaurant match
    IF v_coupon.restaurant_id IS NOT NULL AND v_coupon.restaurant_id != p_restaurant_id THEN
        RETURN QUERY SELECT FALSE, 'COUPON_INVALID_RESTAURANT'::VARCHAR, NULL::NUMERIC, NULL::BIGINT, NULL::VARCHAR, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Check minimum purchase
    IF v_coupon.minimum_purchase IS NOT NULL AND p_order_total < v_coupon.minimum_purchase THEN
        RETURN QUERY SELECT FALSE, 'MIN_ORDER_NOT_MET'::VARCHAR, NULL::NUMERIC, NULL::BIGINT, NULL::VARCHAR, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Check usage limits
    SELECT COUNT(*) INTO v_total_used
    FROM menuca_v3.coupon_usage_log
    WHERE coupon_id = v_coupon.id;

    IF v_coupon.max_redemptions IS NOT NULL AND v_total_used >= v_coupon.max_redemptions THEN
        RETURN QUERY SELECT FALSE, 'USAGE_LIMIT_REACHED'::VARCHAR, NULL::NUMERIC, NULL::BIGINT, NULL::VARCHAR, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Check customer usage
    SELECT COUNT(*) INTO v_customer_used
    FROM menuca_v3.coupon_usage_log
    WHERE coupon_id = v_coupon.id AND user_id = p_customer_id;

    IF v_coupon.use_limit_per_user IS NOT NULL AND v_customer_used >= v_coupon.use_limit_per_user THEN
        RETURN QUERY SELECT FALSE, 'CUSTOMER_ALREADY_USED'::VARCHAR, NULL::NUMERIC, NULL::BIGINT, NULL::VARCHAR, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Calculate discount
    IF v_coupon.discount_type = 'percentage' THEN
        v_discount := p_order_total * (v_coupon.discount_amount / 100);
    ELSE
        v_discount := v_coupon.discount_amount;
    END IF;

    -- Cap discount at order total
    IF v_discount > p_order_total THEN
        v_discount := p_order_total;
    END IF;

    RETURN QUERY SELECT
        TRUE,
        'SUCCESS'::VARCHAR,
        v_discount,
        v_coupon.id,
        v_coupon.name::VARCHAR,
        (p_order_total - v_discount);
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.check_coupon_usage_limit(
    p_coupon_code VARCHAR,
    p_customer_id BIGINT
)
RETURNS TABLE(
    coupon_id BIGINT,
    total_limit INTEGER,
    total_used INTEGER,
    total_remaining INTEGER,
    customer_used INTEGER,
    can_use BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_coupon RECORD;
    v_total_used INTEGER;
    v_customer_used INTEGER;
BEGIN
    SELECT * INTO v_coupon
    FROM menuca_v3.promotional_coupons
    WHERE code = p_coupon_code;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_total_used
    FROM menuca_v3.coupon_usage_log
    WHERE coupon_id = v_coupon.id;

    SELECT COUNT(*) INTO v_customer_used
    FROM menuca_v3.coupon_usage_log
    WHERE coupon_id = v_coupon.id AND user_id = p_customer_id;

    RETURN QUERY SELECT
        v_coupon.id,
        v_coupon.max_redemptions,
        v_total_used,
        COALESCE(v_coupon.max_redemptions - v_total_used, 999999),
        v_customer_used,
        (v_coupon.use_limit_per_user IS NULL OR v_customer_used < v_coupon.use_limit_per_user)::BOOLEAN;
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.redeem_coupon(
    p_coupon_code VARCHAR,
    p_customer_id BIGINT,
    p_order_id BIGINT,
    p_discount_amount NUMERIC,
    p_order_total NUMERIC,
    p_ip_address VARCHAR DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_coupon_id BIGINT;
    v_log_id BIGINT;
BEGIN
    SELECT id INTO v_coupon_id
    FROM menuca_v3.promotional_coupons
    WHERE code = p_coupon_code;

    INSERT INTO menuca_v3.coupon_usage_log (
        coupon_id, user_id, order_id, discount_amount,
        order_total, ip_address, user_agent
    ) VALUES (
        v_coupon_id, p_customer_id, p_order_id, p_discount_amount,
        p_order_total, p_ip_address, p_user_agent
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.apply_coupon_to_order(
    p_order_id BIGINT,
    p_coupon_code VARCHAR,
    p_discount_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE menuca_v3.orders
    SET coupon_code = p_coupon_code,
        discount_amount = p_discount_amount
    WHERE id = p_order_id;

    RETURN FOUND;
END;
$$;
```

### Verification

```sql
-- Test validation
SELECT * FROM menuca_v3.validate_coupon('test15', 983, 165, 50.00, 'delivery');

-- Check usage
SELECT * FROM menuca_v3.check_coupon_usage_limit('test15', 165);

-- Test redemption
SELECT menuca_v3.redeem_coupon('test15', 165, 999999, 7.50, 50.00, '192.168.1.1', 'Mozilla/5.0');
```

### API
- `POST /api/coupons/validate`

---

## FEATURE 3: Auto-Apply Best Deal

**Status:** ✅ | **Type:** Customer | **Date:** 2025-10-29

### What It Does
Automatically finds and applies the best discount (deal or coupon) at checkout.

### SQL Code

```sql
CREATE OR REPLACE FUNCTION menuca_v3.calculate_deal_discount(
    p_deal_id BIGINT,
    p_order_total NUMERIC
)
RETURNS TABLE(
    discount_amount NUMERIC,
    final_total NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_deal RECORD;
    v_discount NUMERIC;
BEGIN
    SELECT * INTO v_deal
    FROM menuca_v3.promotional_deals
    WHERE id = p_deal_id;

    IF v_deal.discount_percent IS NOT NULL THEN
        v_discount := p_order_total * (v_deal.discount_percent / 100);
    ELSIF v_deal.discount_amount IS NOT NULL THEN
        v_discount := v_deal.discount_amount;
    ELSE
        v_discount := 0;
    END IF;

    -- Cap at order total
    IF v_discount > p_order_total THEN
        v_discount := p_order_total;
    END IF;

    RETURN QUERY SELECT v_discount, (p_order_total - v_discount);
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.validate_deal_eligibility(
    p_deal_id BIGINT,
    p_order_total NUMERIC,
    p_service_type VARCHAR,
    p_customer_id BIGINT DEFAULT NULL
)
RETURNS TABLE(
    eligible BOOLEAN,
    reason VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_deal RECORD;
    v_is_active BOOLEAN;
    v_order_count INTEGER;
BEGIN
    SELECT * INTO v_deal
    FROM menuca_v3.promotional_deals
    WHERE id = p_deal_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'DEAL_NOT_FOUND'::VARCHAR;
        RETURN;
    END IF;

    SELECT menuca_v3.is_deal_active_now(p_deal_id) INTO v_is_active;
    IF NOT v_is_active THEN
        RETURN QUERY SELECT FALSE, 'DEAL_INACTIVE'::VARCHAR;
        RETURN;
    END IF;

    IF v_deal.minimum_purchase IS NOT NULL AND p_order_total < v_deal.minimum_purchase THEN
        RETURN QUERY SELECT FALSE, 'MIN_ORDER_NOT_MET'::VARCHAR;
        RETURN;
    END IF;

    IF NOT (v_deal.availability_types @> jsonb_build_array(p_service_type)) THEN
        RETURN QUERY SELECT FALSE, 'SERVICE_TYPE_NOT_ELIGIBLE'::VARCHAR;
        RETURN;
    END IF;

    IF v_deal.is_first_order_only = TRUE AND p_customer_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_order_count
        FROM menuca_v3.orders
        WHERE customer_id = p_customer_id AND status = 'completed';

        IF v_order_count > 0 THEN
            RETURN QUERY SELECT FALSE, 'FIRST_ORDER_ONLY'::VARCHAR;
            RETURN;
        END IF;
    END IF;

    RETURN QUERY SELECT TRUE, 'ELIGIBLE'::VARCHAR;
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.auto_apply_best_deal(
    p_restaurant_id BIGINT,
    p_order_total NUMERIC,
    p_service_type VARCHAR,
    p_customer_id BIGINT DEFAULT NULL
)
RETURNS TABLE(
    has_deal BOOLEAN,
    deal_id BIGINT,
    coupon_id BIGINT,
    deal_type VARCHAR,
    discount_amount NUMERIC,
    final_total NUMERIC,
    deal_title VARCHAR,
    coupon_code VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_deal RECORD;
    v_coupon RECORD;
    v_best_discount NUMERIC := 0;
    v_best_deal_id BIGINT;
    v_best_coupon_id BIGINT;
    v_best_type VARCHAR;
    v_best_title VARCHAR;
    v_best_code VARCHAR;
    v_eligibility RECORD;
    v_discount RECORD;
    v_coupon_validation RECORD;
BEGIN
    -- Check all deals
    FOR v_deal IN
        SELECT * FROM menuca_v3.promotional_deals
        WHERE restaurant_id = p_restaurant_id
    LOOP
        SELECT * INTO v_eligibility
        FROM menuca_v3.validate_deal_eligibility(
            v_deal.id, p_order_total, p_service_type, p_customer_id
        );

        IF v_eligibility.eligible THEN
            SELECT * INTO v_discount
            FROM menuca_v3.calculate_deal_discount(v_deal.id, p_order_total);

            IF v_discount.discount_amount > v_best_discount THEN
                v_best_discount := v_discount.discount_amount;
                v_best_deal_id := v_deal.id;
                v_best_coupon_id := NULL;
                v_best_type := 'deal';
                v_best_title := v_deal.name;
                v_best_code := NULL;
            END IF;
        END IF;
    END LOOP;

    -- Check all coupons if customer_id provided
    IF p_customer_id IS NOT NULL THEN
        FOR v_coupon IN
            SELECT * FROM menuca_v3.promotional_coupons
            WHERE (restaurant_id = p_restaurant_id OR restaurant_id IS NULL)
        LOOP
            SELECT * INTO v_coupon_validation
            FROM menuca_v3.validate_coupon(
                v_coupon.code, p_restaurant_id, p_customer_id, p_order_total, p_service_type
            );

            IF v_coupon_validation.valid AND v_coupon_validation.discount_amount > v_best_discount THEN
                v_best_discount := v_coupon_validation.discount_amount;
                v_best_deal_id := NULL;
                v_best_coupon_id := v_coupon.id;
                v_best_type := 'coupon';
                v_best_title := v_coupon.name;
                v_best_code := v_coupon.code;
            END IF;
        END LOOP;
    END IF;

    IF v_best_discount > 0 THEN
        RETURN QUERY SELECT
            TRUE,
            v_best_deal_id,
            v_best_coupon_id,
            v_best_type,
            v_best_discount,
            (p_order_total - v_best_discount),
            v_best_title,
            v_best_code;
    ELSE
        RETURN QUERY SELECT
            FALSE,
            NULL::BIGINT,
            NULL::BIGINT,
            NULL::VARCHAR,
            NULL::NUMERIC,
            p_order_total,
            NULL::VARCHAR,
            NULL::VARCHAR;
    END IF;
END;
$$;
```

### Verification

```sql
-- Test auto-apply
SELECT * FROM menuca_v3.auto_apply_best_deal(18, 50.00, 'delivery', 165);

-- Test deal discount calculation
SELECT * FROM menuca_v3.calculate_deal_discount(240, 50.00);

-- Test eligibility
SELECT * FROM menuca_v3.validate_deal_eligibility(240, 50.00, 'delivery', 165);
```

### API
- `POST /api/checkout/auto-apply-deal`

---

## FEATURE 4: Flash Sales

**Status:** ✅ | **Type:** Customer + Admin | **Date:** 2025-10-29

### What It Does
Creates limited-time, limited-quantity deals with atomic slot claiming to prevent race conditions.

### SQL Code

```sql
CREATE TABLE menuca_v3.flash_sale_claims (
    id BIGSERIAL PRIMARY KEY,
    deal_id BIGINT REFERENCES menuca_v3.promotional_deals(id) ON DELETE CASCADE,
    customer_id BIGINT REFERENCES menuca_v3.users(id),
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    order_id BIGINT REFERENCES menuca_v3.orders(id),
    UNIQUE(deal_id, customer_id)
);

CREATE INDEX idx_flash_sale_claims_deal ON menuca_v3.flash_sale_claims(deal_id);
CREATE INDEX idx_flash_sale_claims_customer ON menuca_v3.flash_sale_claims(customer_id);

CREATE OR REPLACE FUNCTION menuca_v3.create_flash_sale(
    p_restaurant_id BIGINT,
    p_title VARCHAR,
    p_discount_value NUMERIC,
    p_quantity_limit INTEGER,
    p_duration_hours INTEGER
)
RETURNS TABLE(
    deal_id BIGINT,
    expires_at TIMESTAMPTZ,
    slots_available INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_deal_id BIGINT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_expires_at := NOW() + (p_duration_hours || ' hours')::INTERVAL;

    INSERT INTO menuca_v3.promotional_deals (
        restaurant_id,
        name,
        discount_percent,
        date_start,
        date_stop,
        is_enabled,
        deal_type,
        order_count_required
    ) VALUES (
        p_restaurant_id,
        p_title,
        p_discount_value,
        NOW(),
        v_expires_at,
        TRUE,
        'flash-sale',
        p_quantity_limit
    ) RETURNING id INTO v_deal_id;

    RETURN QUERY SELECT v_deal_id, v_expires_at, p_quantity_limit;
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.claim_flash_sale_slot(
    p_deal_id BIGINT,
    p_customer_id BIGINT
)
RETURNS TABLE(
    claimed BOOLEAN,
    slots_remaining INTEGER,
    error_code VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_deal RECORD;
    v_claims_count INTEGER;
    v_already_claimed BOOLEAN;
BEGIN
    -- Lock row for update
    SELECT * INTO v_deal
    FROM menuca_v3.promotional_deals
    WHERE id = p_deal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 'DEAL_NOT_FOUND'::VARCHAR;
        RETURN;
    END IF;

    IF v_deal.deal_type != 'flash-sale' THEN
        RETURN QUERY SELECT FALSE, 0, 'NOT_FLASH_SALE'::VARCHAR;
        RETURN;
    END IF;

    IF NOT menuca_v3.is_deal_active_now(p_deal_id) THEN
        RETURN QUERY SELECT FALSE, 0, 'DEAL_EXPIRED'::VARCHAR;
        RETURN;
    END IF;

    -- Check if already claimed
    SELECT EXISTS(
        SELECT 1 FROM menuca_v3.flash_sale_claims
        WHERE deal_id = p_deal_id AND customer_id = p_customer_id
    ) INTO v_already_claimed;

    IF v_already_claimed THEN
        RETURN QUERY SELECT FALSE, 0, 'ALREADY_CLAIMED'::VARCHAR;
        RETURN;
    END IF;

    -- Check slots available
    SELECT COUNT(*) INTO v_claims_count
    FROM menuca_v3.flash_sale_claims
    WHERE deal_id = p_deal_id;

    IF v_claims_count >= v_deal.order_count_required THEN
        RETURN QUERY SELECT FALSE, 0, 'SOLD_OUT'::VARCHAR;
        RETURN;
    END IF;

    -- Claim slot
    INSERT INTO menuca_v3.flash_sale_claims (deal_id, customer_id)
    VALUES (p_deal_id, p_customer_id);

    RETURN QUERY SELECT TRUE, (v_deal.order_count_required - v_claims_count - 1), 'SUCCESS'::VARCHAR;
END;
$$;
```

### Verification

```sql
-- Create flash sale
SELECT * FROM menuca_v3.create_flash_sale(18, '⚡ Flash: 30% Off Next 5!', 30, 5, 24);

-- Claim slot
SELECT * FROM menuca_v3.claim_flash_sale_slot(436, 165);

-- Check remaining slots
SELECT order_count_required - COUNT(*) as remaining
FROM menuca_v3.promotional_deals d
LEFT JOIN menuca_v3.flash_sale_claims c ON d.id = c.deal_id
WHERE d.id = 436
GROUP BY d.order_count_required;
```

### API
- `POST /api/admin/flash-sales`
- `POST /api/flash-sales/:id/claim`

---

## FEATURE 5: Filter Restaurants by Tags

**Status:** ✅ | **Type:** Customer | **Date:** 2025-10-29

### What It Does
Browse restaurants by marketing tags (cuisine types, dietary preferences) with multi-language support.

### SQL Code

```sql
CREATE OR REPLACE FUNCTION menuca_v3.translate_marketing_tag(
    p_tag_id BIGINT,
    p_language VARCHAR DEFAULT 'en'
)
RETURNS TABLE(
    tag_id BIGINT,
    tag_name VARCHAR,
    description TEXT,
    language_code VARCHAR,
    slug VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        COALESCE(tt.tag_name, t.name)::VARCHAR,
        COALESCE(tt.description, t.description),
        COALESCE(tt.language_code, 'en')::VARCHAR,
        t.slug::VARCHAR
    FROM menuca_v3.marketing_tags t
    LEFT JOIN menuca_v3.marketing_tags_translations tt
        ON t.id = tt.tag_id AND tt.language_code = p_language
    WHERE t.id = p_tag_id;
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.get_restaurants_by_tag(
    p_tag_id BIGINT,
    p_language VARCHAR DEFAULT 'en'
)
RETURNS TABLE(
    restaurant_id BIGINT,
    restaurant_name VARCHAR,
    tag_id BIGINT,
    tag_name VARCHAR,
    tag_slug VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.name::VARCHAR,
        t.id,
        COALESCE(tt.tag_name, t.name)::VARCHAR,
        t.slug::VARCHAR
    FROM menuca_v3.restaurant_tag_associations rta
    JOIN menuca_v3.restaurants r ON rta.restaurant_id = r.id
    JOIN menuca_v3.marketing_tags t ON rta.tag_id = t.id
    LEFT JOIN menuca_v3.marketing_tags_translations tt
        ON t.id = tt.tag_id AND tt.language_code = p_language
    WHERE rta.tag_id = p_tag_id
    ORDER BY r.name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.get_restaurants_by_cuisine(
    p_cuisine_slug VARCHAR
)
RETURNS TABLE(
    restaurant_id BIGINT,
    restaurant_name VARCHAR,
    restaurant_slug VARCHAR,
    cuisine_id BIGINT,
    cuisine_name VARCHAR,
    cuisine_slug VARCHAR,
    is_primary BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.name::VARCHAR,
        r.slug::VARCHAR,
        c.id,
        c.name::VARCHAR,
        c.slug::VARCHAR,
        rc.is_primary
    FROM menuca_v3.restaurant_cuisines rc
    JOIN menuca_v3.restaurants r ON rc.restaurant_id = r.id
    JOIN menuca_v3.cuisine_types c ON rc.cuisine_id = c.id
    WHERE c.slug = p_cuisine_slug
        AND c.is_active = TRUE
        AND r.disabled_at IS NULL
    ORDER BY rc.is_primary DESC, r.name ASC;
END;
$$;
```

### Verification

```sql
-- Get tag translation
SELECT * FROM menuca_v3.translate_marketing_tag(36, 'es');

-- Get restaurants by tag
SELECT * FROM menuca_v3.get_restaurants_by_tag(38, 'en');

-- Get restaurants by cuisine
SELECT * FROM menuca_v3.get_restaurants_by_cuisine('burgers');
```

### API
- `GET /api/tags/:id/restaurants?lang=es`
- `GET /api/cuisines/:slug/restaurants`

---

## FEATURE 6: View Available Coupons

**Status:** ✅ | **Type:** Customer | **Date:** 2025-10-29

### What It Does
Lists all active coupons for a restaurant with translations and current usage counts.

### SQL Code

```sql
CREATE OR REPLACE FUNCTION menuca_v3.get_coupon_with_translation(
    p_coupon_id BIGINT,
    p_language VARCHAR DEFAULT 'en'
)
RETURNS TABLE(
    coupon_id BIGINT,
    code VARCHAR,
    name VARCHAR,
    description TEXT,
    terms_and_conditions TEXT,
    language_code VARCHAR,
    discount_type VARCHAR,
    discount_amount NUMERIC,
    minimum_purchase NUMERIC,
    valid_from_at TIMESTAMPTZ,
    valid_until_at TIMESTAMPTZ,
    max_redemptions INTEGER,
    current_usage_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.code::VARCHAR,
        COALESCE(ct.title, c.name)::VARCHAR,
        COALESCE(ct.description, c.description),
        COALESCE(ct.terms_and_conditions, c.terms_and_conditions),
        COALESCE(ct.language_code, 'en')::VARCHAR,
        c.discount_type::VARCHAR,
        c.discount_amount,
        c.minimum_purchase,
        c.valid_from_at,
        c.valid_until_at,
        c.max_redemptions,
        (SELECT COUNT(*) FROM menuca_v3.coupon_usage_log cul WHERE cul.coupon_id = c.id)::INTEGER
    FROM menuca_v3.promotional_coupons c
    LEFT JOIN menuca_v3.promotional_coupons_translations ct
        ON c.id = ct.coupon_id AND ct.language_code = p_language
    WHERE c.id = p_coupon_id;
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.get_coupons_i18n(
    p_restaurant_id BIGINT,
    p_language VARCHAR DEFAULT 'en'
)
RETURNS TABLE(
    coupon_id BIGINT,
    code VARCHAR,
    name VARCHAR,
    description TEXT,
    terms_and_conditions TEXT,
    language_code VARCHAR,
    discount_type VARCHAR,
    discount_amount NUMERIC,
    minimum_purchase NUMERIC,
    valid_from_at TIMESTAMPTZ,
    valid_until_at TIMESTAMPTZ,
    max_redemptions INTEGER,
    current_usage_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.code::VARCHAR,
        COALESCE(ct.title, c.name)::VARCHAR,
        COALESCE(ct.description, c.description),
        COALESCE(ct.terms_and_conditions, c.terms_and_conditions),
        COALESCE(ct.language_code, 'en')::VARCHAR,
        c.discount_type::VARCHAR,
        c.discount_amount,
        c.minimum_purchase,
        c.valid_from_at,
        c.valid_until_at,
        c.max_redemptions,
        (SELECT COUNT(*) FROM menuca_v3.coupon_usage_log cul WHERE cul.coupon_id = c.id)::INTEGER
    FROM menuca_v3.promotional_coupons c
    LEFT JOIN menuca_v3.promotional_coupons_translations ct
        ON c.id = ct.coupon_id AND ct.language_code = p_language
    WHERE (c.restaurant_id = p_restaurant_id OR c.restaurant_id IS NULL)
        AND c.is_active = TRUE
        AND c.deleted_at IS NULL
        AND c.valid_from_at <= NOW()
        AND c.valid_until_at >= NOW();
END;
$$;
```

### Verification

```sql
-- Get single coupon
SELECT * FROM menuca_v3.get_coupon_with_translation(1, 'es');

-- Get all coupons for restaurant
SELECT coupon_id, code, name, current_usage_count
FROM menuca_v3.get_coupons_i18n(983, 'en');
```

### API
- `GET /api/customers/me/coupons?lang=fr`

---

## FEATURE 7: Check Coupon Usage

**Status:** ✅ | **Type:** Customer | **Date:** 2025-10-29

### What It Does
Shows "You've used this 2 out of 3 times" by reusing check_coupon_usage_limit from Feature 2.

### API
- `GET /api/customers/me/coupons/:code/usage`

---

## FEATURE 8: Real-Time Deal Notifications

**Status:** ✅ | **Type:** Customer | **Date:** 2025-10-29

### What It Does
Enables WebSocket push notifications when new deals are created or deals change status.

### Configuration

```sql
-- Enable realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE menuca_v3.promotional_deals;
ALTER PUBLICATION supabase_realtime ADD TABLE menuca_v3.flash_sale_claims;
```

### Frontend Integration

```typescript
// Subscribe to new deals
const dealsChannel = supabase
  .channel('restaurant-18-deals')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'menuca_v3',
    table: 'promotional_deals',
    filter: `restaurant_id=eq.18`
  }, (payload) => {
    showNotification({
      title: 'New Deal Available!',
      body: `${payload.new.name}: Save ${payload.new.discount_percent}%!`
    });
  })
  .subscribe();
```

### API
WebSocket subscription (no REST endpoint)

---

## FEATURE 9: Create Promotional Deals

**Status:** ✅ | **Type:** Admin | **Date:** 2025-10-29

### What It Does
Allows admins to create promotional deals via direct table insert with RLS enforcement.

### API
- `POST /api/admin/restaurants/:id/deals`

### Implementation
Direct INSERT via Supabase client with RLS policies enforcing admin access.

```typescript
const { data, error } = await supabase
  .from('promotional_deals')
  .insert({
    restaurant_id: 18,
    name: '20% Off Weekends',
    discount_percent: 20,
    date_start: '2025-11-01',
    date_stop: '2025-11-30',
    availability_types: ['delivery', 'pickup'],
    is_enabled: true
  });
```

---

## FEATURE 10: Manage Deal Status

**Status:** ✅ | **Type:** Admin | **Date:** 2025-10-30

### What It Does
Enables or disables deals instantly with RLS enforcement.

### SQL Code

```sql
CREATE OR REPLACE FUNCTION menuca_v3.toggle_deal_status(
    p_deal_id BIGINT,
    p_is_enabled BOOLEAN
)
RETURNS TABLE(
    success BOOLEAN,
    deal_id BIGINT,
    is_enabled BOOLEAN,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE menuca_v3.promotional_deals
    SET is_enabled = p_is_enabled,
        updated_at = NOW()
    WHERE id = p_deal_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE::BOOLEAN, NULL::BIGINT, NULL::BOOLEAN, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE::BOOLEAN, p_deal_id, p_is_enabled, NOW();
END;
$$;
```

### Verification

```sql
-- Disable deal
SELECT * FROM menuca_v3.toggle_deal_status(411, false);

-- Re-enable deal
SELECT * FROM menuca_v3.toggle_deal_status(411, true);
```

### API
- `PATCH /api/admin/restaurants/:id/deals/:did/toggle`

---

## FEATURE 11: View Deal Performance

**Status:** ✅ | **Type:** Admin | **Date:** 2025-10-30

### What It Does
Shows deal performance metrics: redemptions, revenue, conversion rate.

### SQL Code

```sql
CREATE OR REPLACE FUNCTION menuca_v3.get_deal_usage_stats(p_deal_id BIGINT)
RETURNS TABLE(
    deal_id BIGINT,
    total_redemptions INTEGER,
    total_discount_given NUMERIC,
    total_revenue NUMERIC,
    avg_order_value NUMERIC,
    conversion_rate NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_deal RECORD;
    v_total_claims INTEGER;
    v_completed_orders INTEGER;
    v_stats RECORD;
BEGIN
    SELECT * INTO v_deal
    FROM menuca_v3.promotional_deals
    WHERE id = p_deal_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT p_deal_id, 0, 0.0, 0.0, 0.0, 0.0;
        RETURN;
    END IF;

    -- For flash sales, count claims
    IF v_deal.deal_type = 'flash-sale' THEN
        SELECT COUNT(*) INTO v_total_claims
        FROM menuca_v3.flash_sale_claims
        WHERE deal_id = p_deal_id;

        SELECT
            COUNT(*) as completed,
            COALESCE(SUM(o.discount_amount), 0) as total_discount,
            COALESCE(SUM(o.total), 0) as total_revenue,
            COALESCE(AVG(o.total), 0) as avg_value
        INTO v_stats
        FROM menuca_v3.flash_sale_claims fsc
        JOIN menuca_v3.orders o ON fsc.order_id = o.id
        WHERE fsc.deal_id = p_deal_id AND o.status = 'completed';

        v_completed_orders := v_stats.completed;

        RETURN QUERY SELECT
            p_deal_id,
            v_completed_orders,
            v_stats.total_discount,
            v_stats.total_revenue,
            v_stats.avg_value,
            CASE
                WHEN v_total_claims > 0 THEN (v_completed_orders::NUMERIC / v_total_claims * 100)
                ELSE 0
            END;
    ELSE
        -- For regular deals, query orders directly
        SELECT
            COUNT(*) as completed,
            COALESCE(SUM(o.discount_amount), 0) as total_discount,
            COALESCE(SUM(o.total), 0) as total_revenue,
            COALESCE(AVG(o.total), 0) as avg_value
        INTO v_stats
        FROM menuca_v3.orders o
        WHERE o.deal_id = p_deal_id AND o.status = 'completed';

        RETURN QUERY SELECT
            p_deal_id,
            v_stats.completed::INTEGER,
            v_stats.total_discount,
            v_stats.total_revenue,
            v_stats.avg_value,
            100.0; -- Conversion rate not applicable for non-flash sales
    END IF;
END;
$$;
```

### Verification

```sql
-- Get deal performance stats
SELECT * FROM menuca_v3.get_deal_usage_stats(436);
```

### API
- `GET /api/admin/deals/:id/stats`

---

## FEATURE 12: Promotion Analytics Dashboard

**Status:** ✅ | **Type:** Admin | **Date:** 2025-10-30

### What It Does
Provides comprehensive analytics for all deals and coupons at restaurant level.

### SQL Code

```sql
CREATE OR REPLACE FUNCTION menuca_v3.get_restaurant_deal_analytics(
    p_restaurant_id BIGINT,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
    total_deals INTEGER,
    active_deals INTEGER,
    total_redemptions INTEGER,
    total_discount_given NUMERIC,
    total_revenue NUMERIC,
    avg_order_value NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT d.id)::INTEGER,
        COUNT(DISTINCT CASE WHEN d.is_enabled = TRUE THEN d.id END)::INTEGER,
        COUNT(o.id)::INTEGER,
        COALESCE(SUM(o.discount_amount), 0),
        COALESCE(SUM(o.total), 0),
        COALESCE(AVG(o.total), 0)
    FROM menuca_v3.promotional_deals d
    LEFT JOIN menuca_v3.orders o ON d.id = o.deal_id
        AND o.status = 'completed'
        AND (p_start_date IS NULL OR o.created_at >= p_start_date)
        AND (p_end_date IS NULL OR o.created_at <= p_end_date)
    WHERE d.restaurant_id = p_restaurant_id;
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.get_restaurant_coupon_analytics(
    p_restaurant_id BIGINT,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
    total_coupons INTEGER,
    active_coupons INTEGER,
    total_redemptions INTEGER,
    total_discount_given NUMERIC,
    total_revenue NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT c.id)::INTEGER,
        COUNT(DISTINCT CASE WHEN c.is_active = TRUE THEN c.id END)::INTEGER,
        COUNT(cul.id)::INTEGER,
        COALESCE(SUM(cul.discount_amount), 0),
        COALESCE(SUM(cul.order_total), 0)
    FROM menuca_v3.promotional_coupons c
    LEFT JOIN menuca_v3.coupon_usage_log cul ON c.id = cul.coupon_id
        AND (p_start_date IS NULL OR cul.used_at >= p_start_date)
        AND (p_end_date IS NULL OR cul.used_at <= p_end_date)
    WHERE c.restaurant_id = p_restaurant_id OR c.restaurant_id IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.get_top_performing_deals(
    p_restaurant_id BIGINT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    deal_id BIGINT,
    deal_name VARCHAR,
    redemptions INTEGER,
    total_discount NUMERIC,
    total_revenue NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.name::VARCHAR,
        COUNT(o.id)::INTEGER,
        COALESCE(SUM(o.discount_amount), 0),
        COALESCE(SUM(o.total), 0)
    FROM menuca_v3.promotional_deals d
    LEFT JOIN menuca_v3.orders o ON d.id = o.deal_id AND o.status = 'completed'
    WHERE d.restaurant_id = p_restaurant_id
    GROUP BY d.id, d.name
    ORDER BY COUNT(o.id) DESC
    LIMIT p_limit;
END;
$$;
```

### Verification

```sql
-- Get restaurant-wide analytics
SELECT * FROM menuca_v3.get_restaurant_deal_analytics(18);
SELECT * FROM menuca_v3.get_restaurant_coupon_analytics(18);

-- Get top deals
SELECT * FROM menuca_v3.get_top_performing_deals(18, 5);

-- Date range query
SELECT * FROM menuca_v3.get_restaurant_deal_analytics(
    18,
    '2025-10-01'::TIMESTAMPTZ,
    '2025-10-31'::TIMESTAMPTZ
);
```

### API
- `GET /api/admin/restaurants/:id/analytics`

---

## FEATURE 13: Clone Deals to Multiple Locations

**Status:** ✅ | **Type:** Admin | **Date:** 2025-10-31

### What It Does
Duplicates a deal to multiple restaurant locations with original translations preserved.

### SQL Code

```sql
CREATE OR REPLACE FUNCTION menuca_v3.clone_deal_to_restaurants(
    p_source_deal_id BIGINT,
    p_target_restaurant_ids BIGINT[]
)
RETURNS TABLE(
    success BOOLEAN,
    cloned_count INTEGER,
    new_deal_ids BIGINT[],
    failed_restaurant_ids BIGINT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_source_deal RECORD;
    v_target_id BIGINT;
    v_new_deal_id BIGINT;
    v_new_deal_ids BIGINT[] := ARRAY[]::BIGINT[];
    v_failed_ids BIGINT[] := ARRAY[]::BIGINT[];
    v_cloned_count INTEGER := 0;
    v_translation RECORD;
BEGIN
    -- Get source deal
    SELECT * INTO v_source_deal
    FROM menuca_v3.promotional_deals
    WHERE id = p_source_deal_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, ARRAY[]::BIGINT[], p_target_restaurant_ids;
        RETURN;
    END IF;

    -- Clone to each target restaurant
    FOREACH v_target_id IN ARRAY p_target_restaurant_ids
    LOOP
        BEGIN
            -- Insert cloned deal
            INSERT INTO menuca_v3.promotional_deals (
                restaurant_id, name, description, terms_and_conditions,
                discount_percent, discount_amount, minimum_purchase,
                date_start, date_stop, is_enabled, availability_types,
                display_order, deal_type, is_first_order_only, order_count_required
            ) VALUES (
                v_target_id,
                v_source_deal.name,
                v_source_deal.description,
                v_source_deal.terms_and_conditions,
                v_source_deal.discount_percent,
                v_source_deal.discount_amount,
                v_source_deal.minimum_purchase,
                v_source_deal.date_start,
                v_source_deal.date_stop,
                v_source_deal.is_enabled,
                v_source_deal.availability_types,
                v_source_deal.display_order,
                v_source_deal.deal_type,
                v_source_deal.is_first_order_only,
                v_source_deal.order_count_required
            ) RETURNING id INTO v_new_deal_id;

            -- Clone translations
            FOR v_translation IN
                SELECT * FROM menuca_v3.promotional_deals_translations
                WHERE deal_id = p_source_deal_id
            LOOP
                INSERT INTO menuca_v3.promotional_deals_translations (
                    deal_id, language_code, title, description, terms_and_conditions
                ) VALUES (
                    v_new_deal_id,
                    v_translation.language_code,
                    v_translation.title,
                    v_translation.description,
                    v_translation.terms_and_conditions
                );
            END LOOP;

            v_new_deal_ids := array_append(v_new_deal_ids, v_new_deal_id);
            v_cloned_count := v_cloned_count + 1;

        EXCEPTION WHEN OTHERS THEN
            v_failed_ids := array_append(v_failed_ids, v_target_id);
        END;
    END LOOP;

    RETURN QUERY SELECT TRUE, v_cloned_count, v_new_deal_ids, v_failed_ids;
END;
$$;
```

### Verification

```sql
-- Clone deal to multiple restaurants
SELECT * FROM menuca_v3.clone_deal_to_restaurants(240, ARRAY[19, 20, 21]);

-- Verify clones
SELECT id, restaurant_id, name FROM menuca_v3.promotional_deals
WHERE id = ANY(ARRAY[437, 438, 439]);

-- Check translations copied
SELECT deal_id, language_code, title
FROM menuca_v3.promotional_deals_translations
WHERE deal_id IN (437, 438, 439);
```

### API
- `POST /api/admin/deals/:id/clone`

---

## FEATURE 14: Soft Delete & Restore

**Status:** ✅ | **Type:** Admin | **Date:** 2025-10-31

### What It Does
Allows admins to soft delete and restore deals/coupons with audit trail.

### SQL Code

```sql
CREATE OR REPLACE FUNCTION menuca_v3.soft_delete_deal(
    p_deal_id BIGINT,
    p_user_id BIGINT
)
RETURNS TABLE(
    success BOOLEAN,
    deal_id BIGINT,
    disabled_at TIMESTAMPTZ,
    disabled_by BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE menuca_v3.promotional_deals
    SET disabled_at = NOW(),
        disabled_by = p_user_id,
        is_enabled = FALSE
    WHERE id = p_deal_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::BIGINT, NULL::TIMESTAMPTZ, NULL::BIGINT;
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, p_deal_id, NOW(), p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.restore_deal(p_deal_id BIGINT)
RETURNS TABLE(
    success BOOLEAN,
    deal_id BIGINT,
    restored_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE menuca_v3.promotional_deals
    SET disabled_at = NULL,
        disabled_by = NULL,
        is_enabled = TRUE
    WHERE id = p_deal_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::BIGINT, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, p_deal_id, NOW();
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.soft_delete_coupon(
    p_coupon_id BIGINT,
    p_user_id BIGINT
)
RETURNS TABLE(
    success BOOLEAN,
    coupon_id BIGINT,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE menuca_v3.promotional_coupons
    SET deleted_at = NOW(),
        deleted_by = p_user_id,
        is_active = FALSE
    WHERE id = p_coupon_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::BIGINT, NULL::TIMESTAMPTZ, NULL::BIGINT;
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, p_coupon_id, NOW(), p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.restore_coupon(p_coupon_id BIGINT)
RETURNS TABLE(
    success BOOLEAN,
    coupon_id BIGINT,
    restored_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE menuca_v3.promotional_coupons
    SET deleted_at = NULL,
        deleted_by = NULL,
        is_active = TRUE
    WHERE id = p_coupon_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::BIGINT, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, p_coupon_id, NOW();
END;
$$;
```

### Verification

```sql
-- Soft delete deal
SELECT * FROM menuca_v3.soft_delete_deal(241, 165);

-- Restore deal
SELECT * FROM menuca_v3.restore_deal(241);

-- Soft delete coupon
SELECT * FROM menuca_v3.soft_delete_coupon(1, 165);

-- Restore coupon
SELECT * FROM menuca_v3.restore_coupon(1);

-- Check audit trail
SELECT id, disabled_at, disabled_by FROM menuca_v3.promotional_deals WHERE id = 241;
```

### API
- `DELETE /api/admin/deals/:id` (soft delete)
- `POST /api/admin/deals/:id/restore`
- `DELETE /api/admin/coupons/:id` (soft delete)
- `POST /api/admin/coupons/:id/restore`

---

## FEATURE 15: Emergency Deal Shutoff

**Status:** ✅ | **Type:** Admin | **Date:** 2025-10-31

### What It Does
Bulk disable all deals instantly for emergencies, then selectively re-enable.

### SQL Code

```sql
CREATE OR REPLACE FUNCTION menuca_v3.bulk_disable_deals(
    p_restaurant_id INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    deals_disabled INTEGER,
    restaurant_id INTEGER,
    disabled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE menuca_v3.promotional_deals
    SET is_enabled = FALSE,
        updated_at = NOW()
    WHERE restaurant_id = p_restaurant_id
        AND is_enabled = TRUE;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN QUERY SELECT TRUE, v_count, p_restaurant_id, NOW();
END;
$$;

CREATE OR REPLACE FUNCTION menuca_v3.bulk_enable_deals(
    p_restaurant_id INTEGER,
    p_deal_ids INTEGER[]
)
RETURNS TABLE(
    success BOOLEAN,
    deals_enabled INTEGER,
    restaurant_id INTEGER,
    enabled_at TIMESTAMPTZ,
    invalid_deal_ids INTEGER[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_valid_ids INTEGER[];
    v_invalid_ids INTEGER[];
    v_count INTEGER;
BEGIN
    -- Validate deal IDs belong to restaurant
    SELECT ARRAY_AGG(id) INTO v_valid_ids
    FROM menuca_v3.promotional_deals
    WHERE id = ANY(p_deal_ids)
        AND restaurant_id = p_restaurant_id;

    -- Find invalid IDs
    SELECT ARRAY_AGG(id) INTO v_invalid_ids
    FROM unnest(p_deal_ids) AS id
    WHERE id != ALL(COALESCE(v_valid_ids, ARRAY[]::INTEGER[]));

    -- Enable valid deals
    UPDATE menuca_v3.promotional_deals
    SET is_enabled = TRUE,
        updated_at = NOW()
    WHERE id = ANY(v_valid_ids);

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN QUERY SELECT
        TRUE,
        v_count,
        p_restaurant_id,
        NOW(),
        COALESCE(v_invalid_ids, ARRAY[]::INTEGER[]);
END;
$$;
```

### Verification

```sql
-- Emergency shutoff
SELECT * FROM menuca_v3.bulk_disable_deals(18);

-- Check deals disabled
SELECT id, name, is_enabled FROM menuca_v3.promotional_deals
WHERE restaurant_id = 18;

-- Selective re-enable
SELECT * FROM menuca_v3.bulk_enable_deals(18, ARRAY[240, 241, 436]);

-- Test with invalid ID
SELECT * FROM menuca_v3.bulk_enable_deals(18, ARRAY[241, 999999]);
```

### API
- `POST /api/admin/restaurants/:id/deals/bulk-disable`
- `POST /api/admin/restaurants/:id/deals/bulk-enable`

---

## Schema Notes

### Actual Column Names (vs Guide)
- `name` (not `title`) - Deal/coupon name
- `is_enabled` (not `is_active`) - Deal status (promotional_deals)
- `is_active` (not `is_enabled`) - Coupon status (promotional_coupons)
- `date_start`, `date_stop` (not `start_date`, `end_date`)
- `disabled_at` (not `deleted_at`) - Soft delete for deals
- `deleted_at` - Soft delete for coupons
- `availability_types` (not `applicable_service_types`) - JSONB array
- `minimum_purchase` (not `minimum_order_amount`)
- `max_redemptions` (not `total_usage_limit`)
- `valid_from_at`, `valid_until_at` (not `valid_from`, `valid_until`)

### Key Tables
- `promotional_deals` - Deal definitions
- `promotional_coupons` - Coupon codes
- `promotional_deals_translations` - Deal i18n
- `promotional_coupons_translations` - Coupon i18n
- `marketing_tags_translations` - Tag i18n
- `flash_sale_claims` - Flash sale slot tracking
- `coupon_usage_log` - Coupon redemption tracking
- `restaurant_tag_associations` - Restaurant-tag links

---

**End of Document** | 1948 lines (reduced from 4116 lines)
