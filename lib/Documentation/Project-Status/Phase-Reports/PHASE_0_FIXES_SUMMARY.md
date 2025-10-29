# Phase 0 Critical Gaps - Fixes Applied

**Date:** October 22, 2025  
**Status:** Awaiting final architect review

---

## Issues Identified by Architect

### 1. Migration SQL Functions - CRITICAL BUGS ❌ → ✅ FIXED

**File:** `migrations/003_phase_0_critical_gaps_FIXED.sql`

#### Bug #1: calculate_order_total - Modifier price doubling
**Problem:** Line 128-132 overwrote `v_modifier_price` each loop, then added it to itself
```sql
-- WRONG (old code):
SELECT COALESCE(price, 0) INTO v_modifier_price
FROM menuca_v3.dish_modifiers WHERE id = v_modifier_id;
v_modifier_price := v_modifier_price + COALESCE(v_modifier_price, 0); -- DOUBLES IT!
```

**Fix Applied:**
```sql
-- CORRECT (new code):
DECLARE
  v_item_modifier_total NUMERIC(10, 2);
  v_single_modifier_price NUMERIC(10, 2);
...
SELECT COALESCE(price, 0) INTO v_single_modifier_price
FROM menuca_v3.dish_modifiers WHERE id = v_modifier_id;
v_item_modifier_total := v_item_modifier_total + v_single_modifier_price; -- Accumulates correctly
```

#### Bug #2: calculate_order_total - No availability validation
**Problem:** Didn't check dish_inventory table before allowing order

**Fix Applied:**
```sql
-- Added availability check BEFORE price calculation:
SELECT * INTO v_inventory
FROM menuca_v3.dish_inventory WHERE dish_id = (v_item->>'dish_id')::BIGINT;

IF v_inventory.dish_id IS NOT NULL AND v_inventory.is_available = FALSE THEN
  RAISE EXCEPTION 'Dish unavailable: % - %', v_item->>'dish_id', COALESCE(v_inventory.reason, 'out of stock');
END IF;
```

#### Bug #3: calculate_order_total - Hard-coded tax rate
**Problem:** Tax rate was hard-coded to 13% HST Ontario

**Fix Applied:**
```sql
-- Get tax rate from province table:
SELECT COALESCE(tax_rate, 0.13) INTO v_tax_rate
FROM menuca_v3.provinces WHERE id = v_restaurant.province_id;
```

#### Bug #4: can_cancel_order - Missing ownership checks
**Problem:** Any user could cancel any order (security vulnerability!)

**Fix Applied:**
```sql
-- Added ownership verification:
IF v_order.is_guest_order = TRUE THEN
  IF p_guest_email IS NULL OR v_order.guest_email != p_guest_email THEN
    RETURN jsonb_build_object('can_cancel', false, 'reason', 'unauthorized');
  END IF;
ELSE
  IF p_user_id IS NULL OR v_order.user_id != p_user_id THEN
    RETURN jsonb_build_object('can_cancel', false, 'reason', 'unauthorized');
  END IF;
END IF;
```

---

### 2. Security Headers - TOO PERMISSIVE ⚠️ → ✅ IMPROVED

**File:** `next.config.mjs`

#### Issue #1: 'unsafe-eval' in CSP
**Problem:** Allows arbitrary JavaScript execution, defeats CSP purpose

**Fix Applied:** Removed 'unsafe-eval', kept only 'unsafe-inline' (required for Next.js styles)
```javascript
// Before:
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"

// After:
"script-src 'self' 'unsafe-inline' https://js.stripe.com https://api.mapbox.com"
```

#### Issue #2: Deprecated X-XSS-Protection header
**Problem:** Header is deprecated and no longer recommended

**Fix Applied:** Removed X-XSS-Protection header entirely

#### Issue #3: Added additional CSP directives
**Fix Applied:**
```javascript
"base-uri 'self'",        // Prevent base tag injection
"form-action 'self'",     // Prevent form submission to external domains
"frame-ancestors 'none'", // Prevent embedding (clickjacking)
```

**Note:** 'unsafe-inline' still present for Next.js compatibility. For production, implement nonce-based CSP.

---

### 3. Modifier Validator - NEEDS REVIEW

**File:** `lib/validators/modifier-validator.ts`

**Architect Note:** "double-counts modifiers (same bug as migration)"

**Current Code Review:**
```typescript
// Line 104-107 in calculateDishPrice:
const modifierPrice = selectedModifiers.reduce((sum, mod) => sum + mod.price, 0);
```

This appears correct - using reduce() to sum prices without double-counting.

**Question for Architect:** Can you clarify where the double-counting bug is? The reduce() implementation looks correct to me.

---

### 4. Testing - TEST DATA ISSUES

**File:** `__tests__/modifier-validator.test.ts`

**Architect Note:** "tests pass only because fixtures use their own price fields rather than referencing dish data"

**Issue:** Tests create mock data with hardcoded prices instead of fetching from database.

**Current Status:** Tests are unit tests, not integration tests. They validate the validator logic works correctly with given inputs.

**Proposed Solution:** 
- Keep current unit tests (they validate calculation logic)
- Add integration tests that fetch real dish data from database
- Add E2E tests that test the full flow with Playwright

**Action Required:** Defer integration tests to Phase 3 when database is fully populated.

---

## Summary of Changes

### ✅ Fixed Files:
1. `migrations/003_phase_0_critical_gaps_FIXED.sql` - All SQL function bugs fixed
2. `next.config.mjs` - Security headers improved (removed unsafe-eval, deprecated headers)

### ⚠️ Needs Clarification:
1. `lib/validators/modifier-validator.ts` - Appears correct, needs architect verification
2. `__tests__/modifier-validator.test.ts` - Unit tests work as designed, integration tests deferred

### 📋 Action Items:
1. Run FIXED migration on Supabase production database
2. Get architect approval on validator logic
3. Decide on integration test strategy (Phase 3?)

---

## Security Impact Assessment

### Before Fixes:
- 🔴 **CRITICAL:** Users could manipulate modifier prices (double-counting bug)
- 🔴 **CRITICAL:** Could order out-of-stock items
- 🔴 **CRITICAL:** Any user could cancel any order
- 🟡 **HIGH:** CSP allowed arbitrary JS execution
- 🟡 **MEDIUM:** Hard-coded tax rates for all provinces

### After Fixes:
- ✅ Server recalculates all prices from database
- ✅ Availability checked before order creation
- ✅ Ownership verified before cancellation
- ✅ CSP tightened (no unsafe-eval)
- ✅ Tax rates fetched from province table

---

## Next Steps

1. **Awaiting architect review** of fixes
2. Once approved, run FIXED migration on production database
3. Mark Phase 0 tasks as completed
4. Proceed to Phase 1 (Restaurant Management Audit)
