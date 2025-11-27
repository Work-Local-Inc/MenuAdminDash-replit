# 🎯 Marketing & Promotions System - Implementation Specification

**Version:** 1.0  
**Date:** November 27, 2025  
**Status:** Planning Phase  
**Author:** AI Agent (Cursor)

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Industry Research](#industry-research)
4. [Proposed Architecture](#proposed-architecture)
5. [Database Schema](#database-schema)
6. [Feature Specifications](#feature-specifications)
7. [UI/UX Design](#uiux-design)
8. [API Design](#api-design)
9. [Implementation Phases](#implementation-phases)
10. [Testing Strategy](#testing-strategy)

---

## 🎯 Executive Summary

### Goal
Build a modern, intuitive marketing and promotions system that allows restaurant owners to create, manage, and analyze promotional campaigns. The system should rival DoorDash/Uber Eats merchant portals while being significantly more user-friendly than the legacy system shown in the screenshots.

### Core Features
1. **Coupons** - Promo codes customers enter at checkout
2. **Deals/Promotions** - Automatic discounts based on conditions
3. **Upsells** - Smart recommendations during ordering
4. **Analytics** - ROI tracking and performance metrics

### Key Differentiators
- Visual deal builder (no confusing dropdowns)
- Real-time preview of how promotions appear to customers
- Smart scheduling with visual calendar
- AI-powered upsell suggestions
- One-click promotion templates

---

## 📊 Current State Analysis

### Existing Tables

#### `promotional_deals` (53 records)
```
Current Deal Types:
├── percent          - % off first order
├── percentTotal     - % off entire order
├── percentTotalSelf - % off (self-service)
├── percentTakeout   - % off takeout orders
├── freeItem         - Free item with purchase
├── priced           - Fixed price bundle
├── value            - $ off order
└── valueTotal       - $ off entire order
```

#### `promotional_coupons` (453 records)
```
Current Coupon Types:
├── percent   - % off with code
├── currency  - $ off with code
├── item      - Free item with code
└── delivery  - Free delivery with code
```

### Legacy UI Issues (from screenshots)
❌ Cluttered form with too many fields visible at once  
❌ Confusing "Deal type" dropdown with 15+ cryptic options  
❌ No visual preview of what customer sees  
❌ Poor mobile experience  
❌ No analytics or ROI tracking  
❌ No templates for common promotions  

---

## 🔬 Industry Research

### DoorDash Merchant Portal Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **Sponsored Listings** | Pay to boost visibility in search | Phase 3 |
| **First Order Discount** | % off for new customers | Phase 1 ✅ |
| **Spend $X, Save $Y** | Tiered discounts | Phase 1 ✅ |
| **Free Delivery** | Waive delivery fee | Phase 1 ✅ |
| **Free Item** | BOGO or free with purchase | Phase 1 ✅ |
| **Happy Hour** | Time-based discounts | Phase 1 ✅ |
| **Flash Sales** | Limited quantity/time | Phase 2 |
| **Customer Win-Back** | Target lapsed customers | Phase 3 |

### Uber Eats Merchant Features
| Feature | Description | Priority |
|---------|-------------|----------|
| **BOGO Deals** | Buy one get one | Phase 1 ✅ |
| **Combo Discounts** | Bundle pricing | Phase 2 |
| **New Customer Promo** | First order incentive | Phase 1 ✅ |
| **Re-order Discount** | Loyalty rewards | Phase 2 |
| **Category Discounts** | % off specific categories | Phase 1 ✅ |
| **Item Discounts** | % off specific items | Phase 1 ✅ |

### Best Practices
1. **Urgency Drivers**: Countdown timers increase conversion by ~20%
2. **Social Proof**: "X people claimed this deal today"
3. **Personalization**: Target promotions based on order history
4. **A/B Testing**: Compare promotion variants
5. **Smart Defaults**: Pre-fill common promotion patterns

---

## 🏗️ Proposed Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    MARKETING & PROMOTIONS HUB                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   COUPONS    │  │    DEALS     │  │   UPSELLS    │          │
│  │              │  │              │  │              │          │
│  │ • Promo codes│  │ • Auto deals │  │ • Smart add- │          │
│  │ • Single use │  │ • Scheduled  │  │   ons        │          │
│  │ • Multi use  │  │ • Recurring  │  │ • Cross-sell │          │
│  │ • Referral   │  │ • Flash sale │  │ • Upgrades   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    TARGETING ENGINE                          ││
│  │  • Categories  • Items  • Order Type  • Time  • Customer   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    ANALYTICS DASHBOARD                       ││
│  │  • Redemptions  • Revenue Impact  • ROI  • A/B Tests       ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Promotion Types Hierarchy

```
PROMOTION
├── COUPON (requires code entry)
│   ├── PercentOff          - "SAVE10" = 10% off
│   ├── AmountOff           - "SAVE5" = $5 off
│   ├── FreeItem            - "FREEAPP" = free appetizer
│   ├── FreeDelivery        - "FREEDEL" = waive delivery fee
│   └── Referral            - "REF123" = friend referral reward
│
├── DEAL (automatic, no code)
│   ├── FirstOrderDiscount  - New customers get X% off
│   ├── SpendAndSave        - Spend $30, get $5 off
│   ├── HappyHour           - 3-5pm daily: 15% off
│   ├── BundleDeal          - Combo pricing
│   ├── BOGO                - Buy one get one free/50%
│   └── FlashSale           - Limited time/quantity
│
└── UPSELL (suggestion during order)
    ├── AddOn               - "Add fries for $2.99"
    ├── Upgrade             - "Make it a large for $1.50"
    ├── CrossSell           - "Customers also bought..."
    └── Combo               - "Complete the meal for $X"
```

---

## 🗄️ Database Schema

### New/Enhanced Tables

#### 1. `promotion_campaigns` (NEW - unified promotions)
```sql
CREATE TABLE menuca_v3.promotion_campaigns (
  id BIGSERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  internal_name VARCHAR(255),  -- Admin-only reference
  description TEXT,
  
  -- Type & Mechanism
  campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN (
    'coupon', 'deal', 'upsell', 'bundle', 'flash_sale', 'loyalty'
  )),
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN (
    'code_entry',           -- Customer enters promo code
    'automatic',            -- Auto-applied when conditions met
    'suggestion',           -- Shown as recommendation
    'first_order',          -- New customer only
    'reorder',              -- Returning customer only
    'cart_threshold'        -- Min cart value
  )),
  
  -- Discount Configuration
  discount_type VARCHAR(50) NOT NULL CHECK (discount_type IN (
    'percent_off',          -- X% off
    'amount_off',           -- $X off
    'fixed_price',          -- Set price (for bundles)
    'free_item',            -- Free item included
    'free_delivery',        -- Waive delivery fee
    'bogo',                 -- Buy X get Y free/discounted
    'tiered'                -- Spend thresholds
  )),
  discount_value DECIMAL(10,2),
  discount_max_value DECIMAL(10,2),  -- Cap for % discounts
  
  -- BOGO specific
  bogo_buy_quantity INTEGER DEFAULT 1,
  bogo_get_quantity INTEGER DEFAULT 1,
  bogo_get_discount_percent DECIMAL(5,2) DEFAULT 100,  -- 100 = free, 50 = half price
  
  -- Conditions
  minimum_order_value DECIMAL(10,2),
  minimum_item_quantity INTEGER,
  maximum_discount_amount DECIMAL(10,2),
  
  -- Scheduling
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  schedule_type VARCHAR(50) CHECK (schedule_type IN (
    'always', 'date_range', 'recurring', 'flash'
  )),
  recurring_schedule JSONB,  -- {"days": ["mon","tue"], "time_start": "11:00", "time_end": "14:00"}
  
  -- Limits
  total_usage_limit INTEGER,         -- Max total redemptions
  per_customer_limit INTEGER,        -- Max per customer (NULL = unlimited)
  daily_limit INTEGER,               -- Max per day
  quantity_available INTEGER,        -- For flash sales
  
  -- Order Type Restrictions
  applies_to_delivery BOOLEAN DEFAULT true,
  applies_to_takeout BOOLEAN DEFAULT true,
  applies_to_dine_in BOOLEAN DEFAULT true,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
    'draft', 'scheduled', 'active', 'paused', 'ended', 'archived'
  )),
  is_featured BOOLEAN DEFAULT false,  -- Show prominently
  display_order INTEGER DEFAULT 0,
  
  -- Display
  customer_display_name VARCHAR(255),  -- What customer sees
  customer_description TEXT,
  badge_text VARCHAR(50),              -- "POPULAR", "NEW", "LIMITED"
  image_url TEXT,
  terms_and_conditions TEXT,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by BIGINT REFERENCES menuca_v3.admin_users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by BIGINT REFERENCES menuca_v3.admin_users(id),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  deleted_by BIGINT REFERENCES menuca_v3.admin_users(id)
);

-- Indexes
CREATE INDEX idx_promo_campaigns_restaurant ON menuca_v3.promotion_campaigns(restaurant_id);
CREATE INDEX idx_promo_campaigns_status ON menuca_v3.promotion_campaigns(status);
CREATE INDEX idx_promo_campaigns_dates ON menuca_v3.promotion_campaigns(starts_at, ends_at);
CREATE INDEX idx_promo_campaigns_type ON menuca_v3.promotion_campaigns(campaign_type, trigger_type);
```

#### 2. `promotion_codes` (Enhanced coupons)
```sql
CREATE TABLE menuca_v3.promotion_codes (
  id BIGSERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE,
  campaign_id BIGINT NOT NULL REFERENCES menuca_v3.promotion_campaigns(id) ON DELETE CASCADE,
  
  code VARCHAR(50) NOT NULL,
  code_type VARCHAR(50) DEFAULT 'standard' CHECK (code_type IN (
    'standard',      -- Normal promo code
    'unique',        -- Single-use generated code
    'referral',      -- User's personal referral code
    'influencer'     -- Tracking code for partners
  )),
  
  -- For unique/personalized codes
  generated_for_user_id BIGINT REFERENCES menuca_v3.users(id),
  referrer_user_id BIGINT REFERENCES menuca_v3.users(id),
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  usage_limit INTEGER,  -- NULL = use campaign limit
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(campaign_id, code)
);

CREATE INDEX idx_promo_codes_code ON menuca_v3.promotion_codes(UPPER(code));
CREATE INDEX idx_promo_codes_campaign ON menuca_v3.promotion_codes(campaign_id);
```

#### 3. `promotion_targets` (What the promotion applies to)
```sql
CREATE TABLE menuca_v3.promotion_targets (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES menuca_v3.promotion_campaigns(id) ON DELETE CASCADE,
  
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN (
    'all_items',           -- Entire menu
    'category',            -- Specific category/course
    'item',                -- Specific dish
    'item_tag',            -- Items with certain tags
    'exclude_category',    -- Everything except category
    'exclude_item'         -- Everything except item
  )),
  
  -- References (one will be set based on target_type)
  course_id BIGINT REFERENCES menuca_v3.courses(id),
  dish_id BIGINT REFERENCES menuca_v3.dishes(id),
  tag_name VARCHAR(100),
  
  -- For BOGO: which items trigger vs which are free
  is_qualifying_item BOOLEAN DEFAULT true,  -- true = must buy, false = gets discount
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promo_targets_campaign ON menuca_v3.promotion_targets(campaign_id);
CREATE INDEX idx_promo_targets_dish ON menuca_v3.promotion_targets(dish_id);
CREATE INDEX idx_promo_targets_course ON menuca_v3.promotion_targets(course_id);
```

#### 4. `promotion_tiers` (For spend thresholds)
```sql
CREATE TABLE menuca_v3.promotion_tiers (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES menuca_v3.promotion_campaigns(id) ON DELETE CASCADE,
  
  tier_order INTEGER NOT NULL,        -- 1, 2, 3...
  threshold_amount DECIMAL(10,2),     -- Spend this much...
  discount_type VARCHAR(50) NOT NULL, -- percent_off, amount_off, free_item
  discount_value DECIMAL(10,2),       -- ...get this discount
  free_item_dish_id BIGINT REFERENCES menuca_v3.dishes(id),
  
  description VARCHAR(255),           -- "Spend $30, get $5 off"
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promo_tiers_campaign ON menuca_v3.promotion_tiers(campaign_id);
```

#### 5. `promotion_redemptions` (Usage tracking)
```sql
CREATE TABLE menuca_v3.promotion_redemptions (
  id BIGSERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE,
  
  campaign_id BIGINT NOT NULL REFERENCES menuca_v3.promotion_campaigns(id),
  promotion_code_id BIGINT REFERENCES menuca_v3.promotion_codes(id),
  order_id BIGINT,  -- No FK due to partitioning
  order_created_at TIMESTAMPTZ,
  user_id BIGINT REFERENCES menuca_v3.users(id),
  
  -- What was applied
  discount_type VARCHAR(50) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,  -- Actual discount given
  order_subtotal DECIMAL(10,2),            -- Before discount
  order_total DECIMAL(10,2),               -- After discount
  
  -- Context
  is_first_order BOOLEAN DEFAULT false,
  redemption_source VARCHAR(50),  -- 'checkout', 'cart', 'link'
  
  -- Timestamps
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- For analytics
  session_id UUID,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_promo_redemptions_campaign ON menuca_v3.promotion_redemptions(campaign_id);
CREATE INDEX idx_promo_redemptions_user ON menuca_v3.promotion_redemptions(user_id);
CREATE INDEX idx_promo_redemptions_date ON menuca_v3.promotion_redemptions(redeemed_at);
CREATE INDEX idx_promo_redemptions_order ON menuca_v3.promotion_redemptions(order_id, order_created_at);
```

#### 6. `upsell_rules` (Smart upselling)
```sql
CREATE TABLE menuca_v3.upsell_rules (
  id BIGSERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  
  name VARCHAR(255) NOT NULL,
  
  -- Trigger conditions
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN (
    'item_in_cart',        -- When specific item added
    'category_in_cart',    -- When category item added
    'cart_value',          -- When cart reaches value
    'checkout',            -- At checkout step
    'item_customization'   -- During modifier selection
  )),
  trigger_dish_id BIGINT REFERENCES menuca_v3.dishes(id),
  trigger_course_id BIGINT REFERENCES menuca_v3.courses(id),
  trigger_cart_minimum DECIMAL(10,2),
  
  -- What to suggest
  upsell_type VARCHAR(50) NOT NULL CHECK (upsell_type IN (
    'add_item',            -- Suggest adding an item
    'upgrade_size',        -- Upgrade to larger size
    'add_modifier',        -- Add a modifier
    'complete_combo',      -- Complete a combo meal
    'cross_sell'           -- Related items
  )),
  upsell_dish_id BIGINT REFERENCES menuca_v3.dishes(id),
  upsell_modifier_id BIGINT,
  
  -- Discount for accepting upsell
  discount_percent DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  
  -- Display
  headline VARCHAR(100),          -- "Make it a meal?"
  description VARCHAR(255),       -- "Add fries and drink for only $3.99"
  image_url TEXT,
  
  -- Limits & Priority
  display_priority INTEGER DEFAULT 0,
  max_shows_per_session INTEGER DEFAULT 3,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  
  -- Tracking
  impressions_count INTEGER DEFAULT 0,
  acceptance_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_upsell_rules_restaurant ON menuca_v3.upsell_rules(restaurant_id);
CREATE INDEX idx_upsell_rules_trigger_dish ON menuca_v3.upsell_rules(trigger_dish_id);
CREATE INDEX idx_upsell_rules_trigger_course ON menuca_v3.upsell_rules(trigger_course_id);
```

#### 7. `promotion_templates` (Quick-start templates)
```sql
CREATE TABLE menuca_v3.promotion_templates (
  id SERIAL PRIMARY KEY,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN (
    'new_customer', 'loyalty', 'seasonal', 'time_based', 
    'bundle', 'flash_sale', 'referral', 'event'
  )),
  
  -- Template configuration (JSON)
  template_config JSONB NOT NULL,
  
  -- Display
  icon VARCHAR(50),
  preview_image_url TEXT,
  popularity_score INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with common templates
INSERT INTO menuca_v3.promotion_templates (name, description, category, template_config, icon) VALUES
('First Order Discount', 'Attract new customers with a % off their first order', 'new_customer', 
 '{"campaign_type":"deal","trigger_type":"first_order","discount_type":"percent_off","discount_value":15,"per_customer_limit":1}', 
 'user-plus'),
('Happy Hour', 'Time-limited daily discount during slow periods', 'time_based',
 '{"campaign_type":"deal","trigger_type":"automatic","schedule_type":"recurring","recurring_schedule":{"days":["mon","tue","wed","thu","fri"],"time_start":"15:00","time_end":"17:00"},"discount_type":"percent_off","discount_value":20}',
 'clock'),
('Spend & Save', 'Tiered discounts to increase order value', 'loyalty',
 '{"campaign_type":"deal","trigger_type":"cart_threshold","discount_type":"tiered","tiers":[{"threshold":25,"discount":3},{"threshold":40,"discount":6},{"threshold":60,"discount":10}]}',
 'trending-up'),
('Free Delivery Day', 'Waive delivery fees for a day', 'seasonal',
 '{"campaign_type":"deal","trigger_type":"automatic","discount_type":"free_delivery","schedule_type":"date_range"}',
 'truck'),
('BOGO', 'Buy one, get one free or discounted', 'bundle',
 '{"campaign_type":"deal","trigger_type":"automatic","discount_type":"bogo","bogo_buy_quantity":1,"bogo_get_quantity":1,"bogo_get_discount_percent":100}',
 'copy'),
('Flash Sale', 'Limited time, limited quantity deal', 'flash_sale',
 '{"campaign_type":"flash_sale","trigger_type":"automatic","schedule_type":"flash","quantity_available":50}',
 'zap'),
('Referral Program', 'Reward customers for referrals', 'referral',
 '{"campaign_type":"coupon","trigger_type":"code_entry","discount_type":"amount_off","discount_value":10}',
 'users');
```

---

## 🎨 Feature Specifications

### Feature 1: Promotion Dashboard

#### Overview
Central hub for viewing and managing all promotions with key metrics at a glance.

#### Components
```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🎯 Marketing Hub                                    [+ Create Campaign] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │ Active      │ │ Redemptions │ │ Revenue     │ │ Avg. Order  │      │
│  │ Campaigns   │ │ This Week   │ │ from Promos │ │ Increase    │      │
│  │     8       │ │    234      │ │   $4,521    │ │   +$8.50    │      │
│  │   +2 ↑      │ │   +18% ↑    │ │   +24% ↑    │ │   +12% ↑    │      │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │ Quick Actions                                                        │
│  │ [🎁 New Customer Deal] [⏰ Happy Hour] [🚚 Free Delivery] [📦 Bundle]│
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │ Filter: [All Types ▼] [All Status ▼] [Date Range 📅]    🔍 Search   │
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
│  ACTIVE CAMPAIGNS                                                       │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 🏷️ 15% Off First Order                              DEAL │ ACTIVE │ │
│  │    New customers • 45 redemptions • $675 revenue        [Edit] ⋮  │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │ ⏰ Happy Hour 3-5pm                                 DEAL │ ACTIVE │ │
│  │    Mon-Fri 3-5pm • 128 redemptions • $1,920 revenue     [Edit] ⋮  │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │ 🎫 SAVE10                                         COUPON │ ACTIVE │ │
│  │    10% off any order • 61 uses remaining                [Edit] ⋮  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  SCHEDULED                                                              │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ ⚡ Black Friday Flash Sale                    FLASH │ SCHEDULED   │ │
│  │    Nov 29 • 50% off • 100 claims available          [Edit] ⋮      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Feature 2: Campaign Builder (Visual Wizard)

#### Step 1: Choose Type
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back                     Create Campaign                    Step 1/5 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  What type of promotion do you want to create?                          │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │     🎫           │  │     🎁           │  │     💡           │     │
│  │                  │  │                  │  │                  │     │
│  │    COUPON        │  │     DEAL         │  │    UPSELL        │     │
│  │                  │  │                  │  │                  │     │
│  │ Customers enter  │  │ Automatically    │  │ Suggest add-ons  │     │
│  │ a promo code     │  │ applied when     │  │ during ordering  │     │
│  │ at checkout      │  │ conditions met   │  │                  │     │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘     │
│                                                                         │
│  ─────────────────────── OR USE A TEMPLATE ───────────────────────     │
│                                                                         │
│  Popular Templates:                                                     │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐             │
│  │ 👤 First Order │ │ ⏰ Happy Hour  │ │ 📈 Spend&Save  │             │
│  │    Discount    │ │    Special     │ │    Tiers       │             │
│  └────────────────┘ └────────────────┘ └────────────────┘             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Step 2: Configure Discount
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back                     Create Deal                        Step 2/5 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  How do you want to discount?                                           │
│                                                                         │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│  │    %      │  │    $       │  │   FREE     │  │   BOGO     │          │
│  │  15% OFF   │  │  $5 OFF    │  │   ITEM     │  │  Buy 1     │          │
│  │    ●       │  │    ○       │  │    ○       │  │  Get 1     │          │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘          │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │  Discount amount                                                     │
│  │  ┌────────────────────────────────────────────────────────────┐    │
│  │  │  15  │ %                                                    │    │
│  │  └────────────────────────────────────────────────────────────┘    │
│  │                                                                     │
│  │  ☑ Cap maximum discount at $ [25.00]                               │
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │  Requirements (optional)                                             │
│  │                                                                     │
│  │  ☑ Minimum order value  $ [20.00]                                  │
│  │  ☐ Minimum item quantity    [  ]                                   │
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
│                                               [Cancel]    [Continue →] │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Step 3: Target Items
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back                     Create Deal                        Step 3/5 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  What does this promotion apply to?                                     │
│                                                                         │
│  ● Entire menu                                                          │
│  ○ Specific categories                                                  │
│  ○ Specific items                                                       │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────     │
│                                                                         │
│  Exclude any items? (optional)                                          │
│                                                                         │
│  ☑ Exclude certain categories                                          │
│     ┌───────────────────────────────────────────────────────────┐     │
│     │ [×] Drinks   [×] Desserts   [+ Add category]              │     │
│     └───────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ☐ Exclude certain items                                               │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────     │
│                                                                         │
│  Order type restrictions:                                               │
│                                                                         │
│  ☑ Delivery    ☑ Takeout    ☐ Dine-in                                 │
│                                                                         │
│                                               [Cancel]    [Continue →] │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Step 4: Schedule
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back                     Create Deal                        Step 4/5 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  When should this promotion be active?                                  │
│                                                                         │
│  ○ Always active (no end date)                                         │
│  ● Date range                                                          │
│  ○ Recurring schedule (e.g., Happy Hour)                               │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │  📅 November 2025                                                   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │
│  │  │ Su   Mo   Tu   We   Th   Fr   Sa                           │   │
│  │  │                          ●27  28   29                       │   │
│  │  │ 30   ○1   ○2   ○3   ○4   ○5   ○6                           │   │
│  │  │ ○7   ○8   ○9   ○10  ○11  ○12  ●13                          │   │
│  │  └─────────────────────────────────────────────────────────────┘   │
│  │                                                                     │
│  │  Start: Nov 27, 2025 at 12:00 AM                                   │
│  │  End:   Dec 13, 2025 at 11:59 PM                                   │
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │  Usage limits (optional)                                            │
│  │                                                                     │
│  │  ☑ Total redemptions limit  [500]                                  │
│  │  ☑ Per customer limit       [1]     (great for first-order deals) │
│  │  ☐ Daily limit              [  ]                                   │
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
│                                               [Cancel]    [Continue →] │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Step 5: Review & Launch
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back                     Create Deal                        Step 5/5 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Review your promotion                                                  │
│                                                                         │
│  ┌──────────────────────────────────────┬──────────────────────────────┐
│  │ CONFIGURATION                        │ CUSTOMER PREVIEW            │
│  ├──────────────────────────────────────┼──────────────────────────────┤
│  │                                      │ ┌────────────────────────┐  │
│  │ Name                                 │ │   🎁 15% OFF           │  │
│  │ 15% Off First Online Order           │ │                        │  │
│  │                                      │ │   Your First Order     │  │
│  │ Type                                 │ │                        │  │
│  │ Deal (automatic)                     │ │   Get 15% off when you │  │
│  │                                      │ │   order for the first  │  │
│  │ Discount                             │ │   time online!         │  │
│  │ 15% off (max $25)                    │ │                        │  │
│  │                                      │ │   Min. order: $20      │  │
│  │ Requirements                         │ │                        │  │
│  │ • First order only                   │ │   ────────────────────  │  │
│  │ • $20 minimum order                  │ │   📅 Nov 27 - Dec 13   │  │
│  │ • Delivery & Takeout                 │ │   🚚 Delivery          │  │
│  │                                      │ │   🥡 Takeout           │  │
│  │ Schedule                             │ └────────────────────────┘  │
│  │ Nov 27 - Dec 13, 2025                │                              │
│  │                                      │                              │
│  │ Limits                               │                              │
│  │ 500 total, 1 per customer            │                              │
│  └──────────────────────────────────────┴──────────────────────────────┘
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │ Customer-facing details (optional)                                   │
│  │                                                                     │
│  │ Display name: [15% Off Your First Order                          ] │
│  │ Description:  [Get 15% off when you order online for the first   ] │
│  │               [time. Minimum order $20.                           ] │
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
│  [Save as Draft]                          [Schedule] [🚀 Launch Now!] │
└─────────────────────────────────────────────────────────────────────────┘
```

### Feature 3: Upsell Manager

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 💡 Upsell Rules                                        [+ Create Rule] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                       │
│  │ Active      │ │ Impressions │ │ Acceptance  │                       │
│  │ Rules       │ │ This Week   │ │ Rate        │                       │
│  │     5       │ │   1,234     │ │   23%       │                       │
│  └─────────────┘ └─────────────┘ └─────────────┘                       │
│                                                                         │
│  ACTIVE RULES                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 🍟 "Add Fries?"                                                    │ │
│  │    When: Burger added to cart                                      │ │
│  │    Offer: Add Large Fries for $2.99 (save $1.50)                   │ │
│  │    Performance: 456 shown • 89 accepted (19.5%)                    │ │
│  │                                                    [Edit] [⋮]      │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │ 🥤 "Make it a Combo?"                                              │ │
│  │    When: Any entrée added to cart                                  │ │
│  │    Offer: Add Drink + Side for $4.99                               │ │
│  │    Performance: 892 shown • 267 accepted (29.9%)  ⭐ Top Performer │ │
│  │                                                    [Edit] [⋮]      │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │ ⬆️ "Upgrade to Large?"                                             │ │
│  │    When: Medium pizza selected                                     │ │
│  │    Offer: Upgrade to Large for only $3 more                        │ │
│  │    Performance: 234 shown • 78 accepted (33.3%)                    │ │
│  │                                                    [Edit] [⋮]      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  💡 AI Suggestions (based on your menu)                                │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Customers who order "Chicken Parmesan" often also order            │ │
│  │ "Caesar Salad" - consider creating an upsell rule.    [Create →]   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Feature 4: Analytics Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 Promotion Analytics                    [Date Range: Last 30 Days ▼] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │ Total       │ │ Revenue     │ │ Avg. Order  │ │ Customer    │      │
│  │ Redemptions │ │ from Promos │ │ with Promo  │ │ Acquisition │      │
│  │   1,247     │ │   $18,705   │ │   $38.50    │ │    156      │      │
│  │   +23% ↑    │ │   +31% ↑    │ │   +$6.20 ↑  │ │   new users │      │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │ Redemptions Over Time                                               │
│  │                                                                     │
│  │  80 ┤                                    ╭─╮                        │
│  │  60 ┤              ╭─╮     ╭─╮         │  │   ╭─╮                  │
│  │  40 ┤    ╭─╮     │  ╰─────╯  │    ╭───╯  ╰───╯  │                 │
│  │  20 ┤───╯  ╰─────╯           ╰────╯              ╰────             │
│  │   0 ┼────────────────────────────────────────────────────          │
│  │      Nov 1                                              Nov 27     │
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
│  TOP PERFORMING CAMPAIGNS                                               │
│  ┌────────────────────────┬────────┬──────────┬───────────┬──────────┐│
│  │ Campaign               │ Type   │ Redemp.  │ Revenue   │ ROI      ││
│  ├────────────────────────┼────────┼──────────┼───────────┼──────────┤│
│  │ 15% First Order        │ Deal   │ 156      │ $4,680    │ 312%     ││
│  │ Happy Hour 3-5pm       │ Deal   │ 432      │ $6,480    │ 245%     ││
│  │ SAVE10                 │ Coupon │ 287      │ $4,305    │ 198%     ││
│  │ Free Delivery Friday   │ Deal   │ 198      │ $2,970    │ 167%     ││
│  │ BOGO Appetizers        │ Deal   │ 174      │ $1,740    │ 142%     ││
│  └────────────────────────┴────────┴──────────┴───────────┴──────────┘│
│                                                                         │
│  [Export Report 📥]                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Design

### Endpoints

#### Campaigns
```
GET    /api/admin/promotions/campaigns           - List all campaigns
POST   /api/admin/promotions/campaigns           - Create campaign
GET    /api/admin/promotions/campaigns/:id       - Get campaign details
PATCH  /api/admin/promotions/campaigns/:id       - Update campaign
DELETE /api/admin/promotions/campaigns/:id       - Delete (soft)
POST   /api/admin/promotions/campaigns/:id/pause - Pause campaign
POST   /api/admin/promotions/campaigns/:id/resume- Resume campaign
POST   /api/admin/promotions/campaigns/:id/duplicate - Clone campaign
```

#### Codes
```
GET    /api/admin/promotions/codes               - List all codes
POST   /api/admin/promotions/codes               - Create code(s)
POST   /api/admin/promotions/codes/generate      - Generate unique codes
DELETE /api/admin/promotions/codes/:id           - Deactivate code
```

#### Upsells
```
GET    /api/admin/promotions/upsells             - List upsell rules
POST   /api/admin/promotions/upsells             - Create rule
PATCH  /api/admin/promotions/upsells/:id         - Update rule
DELETE /api/admin/promotions/upsells/:id         - Delete rule
```

#### Analytics
```
GET    /api/admin/promotions/analytics           - Dashboard metrics
GET    /api/admin/promotions/analytics/campaigns/:id - Campaign performance
GET    /api/admin/promotions/analytics/export    - Export report
```

#### Customer-Facing
```
POST   /api/promotions/validate                  - Validate promo code
GET    /api/promotions/available                 - Get available deals
GET    /api/promotions/upsells                   - Get upsell suggestions
POST   /api/promotions/apply                     - Apply to cart
```

### Request/Response Examples

#### Create Campaign
```typescript
// POST /api/admin/promotions/campaigns
{
  "name": "15% Off First Order",
  "campaign_type": "deal",
  "trigger_type": "first_order",
  "discount_type": "percent_off",
  "discount_value": 15,
  "discount_max_value": 25,
  "minimum_order_value": 20,
  "schedule_type": "date_range",
  "starts_at": "2025-11-27T00:00:00Z",
  "ends_at": "2025-12-13T23:59:59Z",
  "per_customer_limit": 1,
  "total_usage_limit": 500,
  "applies_to_delivery": true,
  "applies_to_takeout": true,
  "customer_display_name": "15% Off Your First Order",
  "customer_description": "Get 15% off when you order online for the first time!"
}

// Response
{
  "id": 1,
  "uuid": "abc123...",
  "status": "scheduled",
  ...
}
```

#### Validate Promo Code (Customer)
```typescript
// POST /api/promotions/validate
{
  "code": "SAVE10",
  "restaurant_id": 123,
  "cart": {
    "items": [...],
    "subtotal": 45.00
  },
  "user_id": 456,  // or null for guest
  "order_type": "delivery"
}

// Response - Valid
{
  "valid": true,
  "discount": {
    "type": "percent_off",
    "value": 10,
    "amount": 4.50,
    "description": "10% off your order"
  },
  "campaign": {
    "name": "SAVE10",
    "terms": "Cannot be combined with other offers"
  }
}

// Response - Invalid
{
  "valid": false,
  "error": {
    "code": "MIN_ORDER_NOT_MET",
    "message": "Add $5.00 more to use this code",
    "details": {
      "minimum_required": 50.00,
      "current_total": 45.00
    }
  }
}
```

---

## 📅 Implementation Phases

### Phase 1: Foundation (2-3 weeks)
- [ ] Create new database tables (migration)
- [ ] Migrate existing promotional_deals and promotional_coupons data
- [ ] Build core API endpoints for campaigns CRUD
- [ ] Create basic campaign list view
- [ ] Create campaign builder wizard (steps 1-5)

### Phase 2: Coupon System (1-2 weeks)  
- [ ] Promo code validation API
- [ ] Code generation for unique codes
- [ ] Integration with checkout flow
- [ ] Coupon management UI

### Phase 3: Deal Engine (2 weeks)
- [ ] Automatic deal detection at checkout
- [ ] First-order detection logic
- [ ] Time-based deals (Happy Hour)
- [ ] Spend threshold tiers
- [ ] BOGO logic

### Phase 4: Upsells (1-2 weeks)
- [ ] Upsell rules database and API
- [ ] Cart integration for upsell triggers
- [ ] Upsell management UI
- [ ] Performance tracking

### Phase 5: Analytics (1 week)
- [ ] Redemption tracking
- [ ] Analytics dashboard
- [ ] Campaign performance metrics
- [ ] Export functionality

### Phase 6: Polish (1 week)
- [ ] Template library
- [ ] Customer preview system
- [ ] A/B testing foundation
- [ ] Documentation

---

## ✅ Testing Strategy

### Unit Tests
- Discount calculation logic
- Date/time schedule validation
- Code validation rules
- Tier threshold logic

### Integration Tests
- Campaign CRUD operations
- Code redemption flow
- Checkout integration
- Analytics data collection

### E2E Tests
- Full campaign creation wizard
- Code application at checkout
- Deal auto-application
- Analytics accuracy

### Test Cases for Discount Calculation
```typescript
describe('PromotionEngine', () => {
  it('applies percent discount correctly', () => {
    const cart = { subtotal: 50.00 };
    const promo = { discount_type: 'percent_off', discount_value: 15 };
    expect(calculateDiscount(cart, promo)).toBe(7.50);
  });

  it('respects maximum discount cap', () => {
    const cart = { subtotal: 200.00 };
    const promo = { discount_type: 'percent_off', discount_value: 20, discount_max_value: 25 };
    expect(calculateDiscount(cart, promo)).toBe(25.00); // Capped, not $40
  });

  it('rejects code when minimum not met', () => {
    const cart = { subtotal: 15.00 };
    const promo = { minimum_order_value: 20 };
    expect(validatePromotion(cart, promo)).toEqual({
      valid: false,
      error: 'MIN_ORDER_NOT_MET'
    });
  });

  it('applies best tier for spend threshold', () => {
    const cart = { subtotal: 45.00 };
    const tiers = [
      { threshold: 25, discount: 3 },
      { threshold: 40, discount: 6 },
      { threshold: 60, discount: 10 }
    ];
    expect(getBestTier(cart, tiers)).toEqual({ threshold: 40, discount: 6 });
  });
});
```

---

## 🎨 Design System Notes

### Color Scheme (for promotion badges)
- **Active/Success**: `#22C55E` (green)
- **Scheduled**: `#3B82F6` (blue)
- **Paused**: `#F59E0B` (amber)
- **Ended**: `#6B7280` (gray)
- **Flash Sale**: `#EF4444` (red) with pulse animation

### Icons (Lucide React)
- Coupon: `Ticket`
- Deal: `Gift`
- Upsell: `Lightbulb`
- Analytics: `BarChart3`
- Calendar: `Calendar`
- Clock: `Clock`
- Percentage: `Percent`
- Dollar: `DollarSign`

### Animation Ideas
- Flash sale countdown with animated numbers
- Success animation when promo applied
- Confetti when deal claimed
- Pulse effect on "limited time" badges

---

## 📝 Notes for Developers

### Key Considerations
1. **Timezone handling**: All times stored in UTC, convert using restaurant timezone for display
2. **Currency**: Support CAD primarily, USD secondary
3. **Conflict resolution**: When multiple promotions apply, take best discount for customer (or allow stacking with flag)
4. **Audit trail**: Log all promotion changes for compliance
5. **Performance**: Cache active promotions per restaurant

### Migration from Legacy Tables
The existing `promotional_deals` and `promotional_coupons` tables should be:
1. Preserved as-is during migration
2. Data copied to new `promotion_campaigns` structure
3. Legacy tables can be deprecated after verification
4. Keep FK references working during transition

---

**Document Status**: Ready for review  
**Next Steps**: 
1. Review with stakeholders
2. Finalize Phase 1 scope
3. Create database migration
4. Begin UI development

