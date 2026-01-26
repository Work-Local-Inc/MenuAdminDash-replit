# Marketing Hub Features - Developer Handoff

## Overview

This document details the implementation of 6 marketing features for the Menu.ca promotional system. All features are production-ready and integrated with the existing Supabase backend.

---

## 1. Bilingual Translations (EN/FR)

### Purpose
Support French translations for promotional deals and coupons with English fallback.

### Database Schema
```sql
-- promotional_deals table
title_en VARCHAR      -- English title
title_fr VARCHAR      -- French title (nullable, falls back to English)
description_en TEXT   -- English description
description_fr TEXT   -- French description (nullable)

-- promotional_coupons table
name_en VARCHAR       -- English name
name_fr VARCHAR       -- French name (nullable)
```

### Key Files
- `app/admin/coupons/page.tsx` - Admin form with EN/FR input fields
- `app/admin/promotions/deals/page.tsx` - Deal form with bilingual inputs
- `lib/validations/coupon.ts` - Zod schemas with bilingual fields

### Implementation Notes
- Forms display side-by-side EN/FR fields
- French fields are optional - system falls back to English if blank
- Customer-facing display uses user's locale preference

---

## 2. Coupon Validation at Checkout

### Purpose
Server-side validation of coupon codes at payment intent creation to prevent fraudulent discount claims.

### Key Files
- `components/customer/coupon-input.tsx` - Cart drawer coupon input component
- `app/api/promotions/validate/route.ts` - Validation endpoint (preview)
- `app/api/customer/create-payment-intent/route.ts` - Checkout validation
- `lib/stores/cart-store.ts` - AppliedPromo interface

### API Flow
```
1. User enters coupon code → POST /api/promotions/validate
2. Validation checks: active, date range, order type, minimum purchase, usage limits
3. If valid, coupon stored in cart state (appliedPromo)
4. At checkout → create-payment-intent re-validates server-side
5. Order created with promo_id, discount_amount, promo_code
6. Usage logged to coupon_usage_log table
```

### Validation Checks
- `is_active` - Coupon must be active
- `valid_from` / `valid_until` - Date range check
- `order_types` - Delivery/pickup restriction
- `minimum_purchase` - Minimum order amount
- `max_redemptions` - Total usage limit
- `max_uses_per_customer` - Per-customer limit
- `discount_tiers` - Tiered discount thresholds
- `targeting_type/mode/ids` - Item targeting

### Database Tables
- `menuca_v3.promotional_coupons` - Coupon definitions
- `menuca_v3.coupon_usage_log` - Redemption tracking

---

## 3. Deal Analytics Dashboard

### Purpose
Real-time analytics for promotional performance with charts and metrics.

### Key Files
- `app/admin/promotions/analytics/page.tsx` - Dashboard UI
- `app/api/admin/promotions/analytics/chart-data/route.ts` - Chart data API
- `app/api/admin/promotions/analytics/overview/route.ts` - Overview stats

### Metrics Displayed
- **Overview Cards**: Active deals, active coupons, total redemptions, total discount given
- **Redemption Trends Chart**: Monthly coupon usage and discount amounts (Recharts)
- **Most Used Coupons Table**: Top coupons by redemption count

### Data Sources
```sql
-- Monthly trends (from coupon_usage_log)
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as redemption_count,
  SUM(discount_amount) as discount_total
FROM menuca_v3.coupon_usage_log
WHERE coupon_id IN (SELECT id FROM promotional_coupons WHERE restaurant_id = ?)
GROUP BY month
ORDER BY month DESC
```

---

## 4. Usage Limits

### Purpose
Limit coupon redemptions both globally and per-customer.

### Database Schema
```sql
-- promotional_coupons table
max_redemptions INTEGER        -- Total usage limit (null = unlimited)
max_uses_per_customer INTEGER  -- Per-customer limit (null = unlimited)
```

### Key Files
- `app/admin/coupons/page.tsx` - Admin form with limit inputs
- `app/api/promotions/validate/route.ts` - Usage count queries
- `app/api/customer/create-payment-intent/route.ts` - Checkout validation

### Validation Logic
```typescript
// Check total usage
const { count: totalUsage } = await supabase
  .schema('menuca_v3')
  .from('coupon_usage_log')
  .select('*', { count: 'exact' })
  .eq('coupon_id', coupon.id);

if (coupon.max_redemptions && totalUsage >= coupon.max_redemptions) {
  return { valid: false, message: 'Coupon usage limit reached' };
}

// Check per-customer usage (if customer_id provided)
if (customerId && coupon.max_uses_per_customer) {
  const { count: customerUsage } = await supabase
    .schema('menuca_v3')
    .from('coupon_usage_log')
    .select('*', { count: 'exact' })
    .eq('coupon_id', coupon.id)
    .eq('customer_id', customerId);
    
  if (customerUsage >= coupon.max_uses_per_customer) {
    return { valid: false, message: 'You have reached the usage limit' };
  }
}
```

---

## 5. Tiered Discounts

### Purpose
Progressive discounts where customers get bigger savings for larger orders.

### Database Schema
```sql
-- promotional_coupons table
discount_tiers JSONB  -- Array of tier objects
```

### Tier Structure
```typescript
interface DiscountTier {
  minimum_amount: number;  // Threshold to unlock tier
  discount_value: number;  // Discount at this tier
  discount_type: 'percentage' | 'fixed';
}

// Example: Spend more, save more
[
  { minimum_amount: 30, discount_value: 10, discount_type: 'percentage' },
  { minimum_amount: 50, discount_value: 15, discount_type: 'percentage' },
  { minimum_amount: 100, discount_value: 25, discount_type: 'percentage' }
]
```

### Key Files
- `app/admin/coupons/page.tsx` - Tier builder UI with add/remove rows
- `lib/validations/coupon.ts` - DiscountTier schema
- `app/api/promotions/validate/route.ts` - Tier matching logic

### Validation Logic
```typescript
// Find applicable tier (highest threshold met)
const applicableTier = coupon.discount_tiers
  ?.filter(tier => subtotal >= tier.minimum_amount)
  .sort((a, b) => b.minimum_amount - a.minimum_amount)[0];

if (applicableTier) {
  discountType = applicableTier.discount_type;
  discountValue = applicableTier.discount_value;
}
```

### Cart UI
- Shows current tier discount
- Displays "next tier" incentive: "Spend $X more to get Y% off!"

---

## 6. Item Targeting

### Purpose
Coupons that apply only to specific dishes or courses.

### Database Schema
```sql
-- promotional_coupons table
targeting_type VARCHAR     -- 'all' | 'dish' | 'course'
targeting_mode VARCHAR     -- 'include' | 'exclude'
targeting_ids INTEGER[]    -- Array of dish_id or course_id values
targeting_items JSONB      -- Cached item names for display
```

### Key Files
- `app/admin/coupons/page.tsx` - Targeting UI with multi-select picker
- `app/api/admin/promotions/targeting/route.ts` - Fetch dishes/courses for selectors
- `app/api/promotions/validate/route.ts` - Eligibility calculation
- `app/api/customer/create-payment-intent/route.ts` - Checkout validation
- `components/customer/cart-drawer.tsx` - Targeting display

### Targeting API
```
GET /api/admin/promotions/targeting?restaurant_id=123&type=dish
GET /api/admin/promotions/targeting?restaurant_id=123&type=course
```

### Eligibility Logic
```typescript
function isItemEligible(
  item: CartItem,
  targetingType: string,
  targetingMode: string,
  targetingIds: number[]
): boolean {
  if (!targetingIds?.length) return true;
  
  const targetId = targetingType === 'dish' ? item.dish_id : item.course_id;
  
  // Handle missing course_id for course targeting
  if (targetingType === 'course' && targetId == null) {
    return targetingMode !== 'include';
  }
  
  const isInList = targetingIds.includes(targetId);
  return targetingMode === 'include' ? isInList : !isInList;
}

// Calculate eligible subtotal
const eligibleSubtotal = cartItems
  .filter(item => isItemEligible(item, targetingType, targetingMode, targetingIds))
  .reduce((sum, item) => sum + item.item_subtotal, 0);
```

### Cart Display
When targeting is active, cart shows:
- "Applies to X of Y items"
- "(Discount on $XX.XX)" showing eligible subtotal

### Admin Table Display
- Badge showing "Dishes" or "Courses"
- Target icon with count
- First 2 item names with "+X more" indicator

---

## Common Patterns

### Supabase Client Setup
```typescript
import { createServerClient } from '@/lib/supabase/server';

const supabase = await createServerClient();

// CRITICAL: Always use .schema('menuca_v3') for promotional tables
const { data, error } = await supabase
  .schema('menuca_v3')
  .from('promotional_coupons')
  .select('*')
  .eq('restaurant_id', restaurantId);
```

### Error Handling
All validation endpoints return consistent response format:
```typescript
// Success
{ valid: true, coupon: {...}, discount: {...}, targeting: {...} }

// Failure
{ valid: false, message: 'Human-readable error message' }
```

### Cart Store Interface
```typescript
interface AppliedPromo {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  calculated_discount: number;
  targeting?: {
    type: string;
    mode: string;
    eligible_subtotal: number;
    total_subtotal: number;
    eligible_items_count: number;
    total_items_count: number;
  } | null;
}
```

---

## Testing Considerations

1. **Usage Limits**: Test with multiple redemptions to verify counters
2. **Tiered Discounts**: Test boundary conditions (exactly at threshold)
3. **Item Targeting**: Test include vs exclude modes, missing course_id scenarios
4. **Date Ranges**: Test expired and future-dated coupons
5. **Order Types**: Test delivery-only and pickup-only restrictions

---

## Future Enhancements (Not Implemented)

- Category-level targeting
- Combo/bundle-specific coupons
- First-order discounts
- Referral codes
- Automatic deal application (without code entry)
