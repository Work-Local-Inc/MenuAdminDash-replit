# ⚠️ CRITICAL FINDINGS - Phase 11 Integration Testing

**Date**: October 31, 2025  
**Discovered During**: Integration testing with direct Supabase access  
**Status**: 🚨 **BLOCKING ISSUE**

---

## 🔴 Critical Issue: SQL Function Not Fully Refactored

### Problem Summary

The `get_restaurant_menu()` SQL function was documented as "complete" but was **NOT properly updated** to use the refactored schema. This creates a blocker for Phase 11 API integration.

---

### Issue 1: Function Signature Mismatch

**API Route Expectation** (`app/api/customer/restaurants/[slug]/menu/route.ts`):
```typescript
const { data, error } = await supabase
  .schema('menuca_v3')
  .rpc('get_restaurant_menu', {
    p_restaurant_id: restaurantId,
    p_language_code: language  // ❌ EXPECTS 2 parameters
  });
```

**Actual Function Signature** (verified via direct database query):
```sql
-- Function only accepts 1 parameter:
menuca_v3.get_restaurant_menu(p_restaurant_id bigint)
-- ❌ MISSING p_language_code parameter
```

**Impact**: API route will fail when calling the SQL function with 2 parameters

---

### Issue 2: References Non-Existent Table

**Error** when executing function:
```
relation "menuca_v3.dish_modifier_prices" does not exist
```

**Analysis**:
- The SQL function code still references `dish_modifier_prices` table
- This table was supposedly deprecated/removed during refactoring
- Function was NOT updated to query the new refactored tables

**Expected Behavior**:
- Should query `modifier_groups` table (not `dish_modifier_prices`)
- Should query `dish_prices` table (not JSONB fields)
- Should return structure matching refactored schema

---

## ✅ What IS Working (Verified)

### Database Tables
| Table | Status | Columns Verified |
|-------|--------|------------------|
| `modifier_groups` | ✅ Working | `is_required`, `min_selections`, `max_selections` |
| `dish_prices` | ✅ Working | `size_variant`, `price` |

Sample data confirmed:
```json
{
  "id": "3",
  "dish_id": "54",
  "name": "Extras",
  "is_required": false,
  "min_selections": 0,
  "max_selections": 999  // ✅ Correct default
}
```

### Other SQL Functions
| Function | Status | Notes |
|----------|--------|-------|
| `validate_dish_customization()` | ✅ Working | Correctly enforces required groups |
| `calculate_dish_price()` | ✅ Working | Calculates prices correctly |

---

## 🔧 Required Fixes

### Fix 1: Update `get_restaurant_menu()` Function

**Required Changes**:
1. **Add language parameter**:
   ```sql
   CREATE OR REPLACE FUNCTION menuca_v3.get_restaurant_menu(
     p_restaurant_id bigint,
     p_language_code text DEFAULT 'en'  -- Add this parameter
   )
   ```

2. **Update table references**:
   - Replace `dish_modifier_prices` → `dish_modifiers` + `modifier_groups`
   - Replace JSONB `base_price`/`size_options` → `dish_prices` table queries
   - Ensure response structure matches refactored schema

3. **Return structure**:
   ```json
   {
     "restaurant_id": 123,
     "courses": [
       {
         "id": 1,
         "name": "Appetizers",
         "dishes": [
           {
             "id": 456,
             "name": "Dish Name",
             "prices": [{ "size_variant": "default", "price": 9.99 }],
             "modifier_groups": [
               {
                 "id": 789,
                 "name": "Extras",
                 "is_required": false,
                 "min_selections": 0,
                 "max_selections": 999,
                 "modifiers": [...]
               }
             ]
           }
         ]
       }
     ]
   }
   ```

---

## 📊 Phase 11 Status

| Component | Status | Notes |
|-----------|--------|-------|
| API Routes (Replit) | ✅ Complete | All 6 routes updated, validated, security fixed |
| Hooks Verification | ✅ Complete | `use-menu.ts`, `use-modifiers.ts` compatible |
| Documentation | ✅ Complete | Guide + test plan created |
| SQL Function `validate_dish_customization` | ✅ Working | Verified functional |
| SQL Function `calculate_dish_price` | ✅ Working | Verified functional |
| **SQL Function `get_restaurant_menu`** | **🚨 BROKEN** | **Needs Cursor fix** |
| Integration Testing | ⏳ Blocked | Waiting on SQL function fix |

**Overall Phase 11**: **90% Complete** (blocked on SQL function fix)

---

## 🎯 Next Actions

### For User/Team
1. **Notify Cursor/Backend Team**: `get_restaurant_menu()` SQL function needs refactoring completion
2. **Provide this document** to guide the fix
3. **Re-run integration tests** after function is fixed
4. **Verify API route** returns correct structure

### For Cursor Agent (if continuing work)
1. Fix `get_restaurant_menu()` function signature (add `p_language_code` parameter)
2. Update function to query refactored tables (`dish_prices`, `modifier_groups`)
3. Remove references to deprecated tables (`dish_modifier_prices`)
4. Ensure response structure matches API route expectations
5. Test function with sample data

---

## 🧪 Verification Tests (After Fix)

Run these tests to confirm fix:

### Test 1: Function Signature
```sql
-- Should work with 2 parameters:
SELECT menuca_v3.get_restaurant_menu(123, 'en');
```

### Test 2: No Table Errors
```sql
-- Should NOT throw "dish_modifier_prices does not exist":
SELECT * FROM menuca_v3.get_restaurant_menu(123, 'en');
```

### Test 3: Response Structure
```sql
-- Should return proper JSON structure with courses array:
SELECT jsonb_pretty(to_jsonb(menuca_v3.get_restaurant_menu(123, 'en')));
```

### Test 4: API Route
```bash
# Should return 200 with menu data:
curl http://localhost:5000/api/customer/restaurants/{slug}/menu?language=en
```

---

## 📝 Summary

**Good News**:
- ✅ Replit API integration work is complete and correct
- ✅ Database tables properly refactored (`modifier_groups`, `dish_prices`)
- ✅ 2 out of 3 SQL functions working correctly
- ✅ Security issues fixed in API routes
- ✅ Documentation complete

**Blocking Issue**:
- 🚨 `get_restaurant_menu()` SQL function NOT refactored
- 🚨 Function missing language parameter
- 🚨 Function references non-existent table

**Resolution Path**: Backend/Cursor team must fix SQL function before Phase 11 can be marked complete

---

**Document Created**: October 31, 2025  
**Severity**: Critical (P0)  
**Blocks**: Phase 11 completion, Phase 14 integration testing  
**Owner**: Cursor/Backend Team  
**Discovered By**: Replit Agent (direct Supabase testing)
