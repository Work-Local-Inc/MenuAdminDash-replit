# API Integration Test Plan - Refactored Menu Schema

**Last Updated**: October 31, 2025  
**Status**: ⏳ Pending Execution (Requires Supabase Access)  
**Purpose**: End-to-end validation of refactored API routes

---

## 📋 Test Environment Setup

### Prerequisites
1. **Supabase Access**: Direct access to Menu.ca Supabase project required
2. **Test Restaurant**: At least one active restaurant with menu data
3. **Test Data Requirements**:
   - Restaurant with `slug` for public menu access
   - Active dishes with pricing (`dish_prices` table populated)
   - Modifier groups with modifiers (`modifier_groups`, `dish_modifiers` tables)
   - At least one combo/meal deal (optional)

### Environment Variables (Verified)
- ✅ `SUPABASE_DB_URL` - Available
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Available
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Available (for client)

---

## 🧪 Test Suite 1: Customer Menu Route

### Test 1.1: Fetch Complete Menu (GET /api/customer/restaurants/[slug]/menu)

**Objective**: Verify `get_restaurant_menu()` SQL function returns complete menu hierarchy

**Steps**:
1. Identify a test restaurant slug from Supabase
2. Make GET request: `/api/customer/restaurants/{slug}/menu?language=en`
3. Verify response structure

**Expected Response**:
```json
{
  "restaurant_id": 123,
  "courses": [
    {
      "id": 1,
      "name": "Appetizers",
      "display_order": 0,
      "dishes": [
        {
          "id": 456,
          "name": "Caesar Salad",
          "description": "Fresh romaine lettuce...",
          "image_url": "https://...",
          "is_available": true,
          "prices": [
            { "size_code": "default", "amount": 8.99 },
            { "size_code": "large", "amount": 12.99 }
          ],
          "modifier_groups": [
            {
              "id": 789,
              "name": "Dressing",
              "is_required": true,
              "min_selections": 1,
              "max_selections": 1,
              "modifiers": [
                { "id": 101, "name": "Caesar", "price": 0, "is_default": true },
                { "id": 102, "name": "Ranch", "price": 0.50, "is_default": false }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Assertions**:
- ✅ Response status: 200
- ✅ `restaurant_id` matches query
- ✅ `courses` array exists and not empty
- ✅ Each dish has `prices` array (not null)
- ✅ Modifier groups use correct column names (`is_required`, `min_selections`, `max_selections`)
- ✅ No deprecated fields (e.g., `base_price`, `size_options` JSONB)

**SQL Verification**:
```sql
-- Verify dish_prices table is used (not JSONB)
SELECT d.id, d.name, dp.size_code, dp.amount
FROM menuca_v3.dishes d
JOIN menuca_v3.dish_prices dp ON dp.dish_id = d.id
WHERE d.restaurant_id = 123
LIMIT 5;

-- Verify modifier_groups table exists and used
SELECT mg.id, mg.name, mg.is_required, mg.min_selections, mg.max_selections
FROM menuca_v3.modifier_groups mg
WHERE mg.dish_id = 456
LIMIT 5;
```

---

### Test 1.2: Multi-Language Support

**Objective**: Verify language parameter works correctly

**Steps**:
1. Request menu with `?language=fr`
2. Request menu with `?language=es`
3. Request menu with `?language=en` (default)

**Expected Behavior**:
- Returns translated names/descriptions when available
- Falls back to English if translation missing
- Response structure identical across languages

**Assertions**:
- ✅ French menu returns French text (if translations exist)
- ✅ Missing translations fall back to English
- ✅ Structure remains consistent across all languages

---

### Test 1.3: Empty Menu Handling

**Objective**: Verify graceful handling of restaurants with no menu

**Steps**:
1. Create test restaurant with no courses/dishes (or find one)
2. Request menu: `/api/customer/restaurants/{slug}/menu`

**Expected Response**:
```json
{
  "restaurant_id": 123,
  "courses": []
}
```

**Assertions**:
- ✅ Response status: 200 (not 404)
- ✅ `courses` is empty array (not null)
- ✅ No server errors

---

## 🧪 Test Suite 2: Validation Route

### Test 2.1: Valid Customization (POST /api/menu/validate-customization)

**Objective**: Verify validation passes for correct selections

**Steps**:
1. Identify dish with required modifier groups
2. Submit valid selections:
```json
{
  "dish_id": 456,
  "selected_modifiers": [
    { "modifier_group_id": 789, "modifier_id": 101 }
  ]
}
```

**Expected Response**:
```json
{
  "is_valid": true,
  "errors": []
}
```

**Assertions**:
- ✅ `is_valid` is `true`
- ✅ `errors` array is empty

---

### Test 2.2: Missing Required Group

**Objective**: Verify validation fails when required group not selected

**Steps**:
1. Submit empty selections for dish with required groups:
```json
{
  "dish_id": 456,
  "selected_modifiers": []
}
```

**Expected Response**:
```json
{
  "is_valid": false,
  "errors": ["Dressing is required"]
}
```

**Assertions**:
- ✅ `is_valid` is `false`
- ✅ `errors` array contains meaningful message
- ✅ Error references group name

---

### Test 2.3: Exceeds Max Selections

**Objective**: Verify validation fails when too many modifiers selected

**Steps**:
1. Find group with `max_selections: 2`
2. Submit 3 selections for that group

**Expected Response**:
```json
{
  "is_valid": false,
  "errors": ["Toppings: maximum 2 selections allowed"]
}
```

**Assertions**:
- ✅ `is_valid` is `false`
- ✅ Error message mentions max limit
- ✅ Validation runs against refactored schema

---

### Test 2.4: Invalid Modifier ID

**Objective**: Verify validation rejects non-existent modifiers

**Steps**:
1. Submit request with fake modifier ID (e.g., 999999)

**Expected Behavior**:
- Validation fails
- Error message indicates invalid modifier

---

## 🧪 Test Suite 3: Price Calculation Route

### Test 3.1: Base Price Only (POST /api/menu/calculate-price)

**Objective**: Verify base price calculation without modifiers

**Steps**:
1. Submit request:
```json
{
  "dish_id": 456,
  "size_code": "default",
  "modifiers": []
}
```

**Expected Response**:
```json
{
  "base_price": 8.99,
  "modifier_total": 0,
  "total_price": 8.99,
  "breakdown": [
    { "item": "Caesar Salad (default)", "price": 8.99 }
  ],
  "currency": "CAD"
}
```

**Assertions**:
- ✅ `base_price` matches dish_prices table
- ✅ `modifier_total` is 0
- ✅ `total_price` equals `base_price`
- ✅ `breakdown` array exists
- ✅ `currency` is "CAD"

---

### Test 3.2: Size-Specific Pricing

**Objective**: Verify different size codes return correct prices

**Steps**:
1. Request with `size_code: "small"` → Expect small price
2. Request with `size_code: "large"` → Expect large price
3. Request with `size_code: "default"` → Expect default price

**Expected Behavior**:
- Each size code returns corresponding price from `dish_prices` table
- No JSONB parsing (deprecated)

**SQL Verification**:
```sql
SELECT size_code, amount
FROM menuca_v3.dish_prices
WHERE dish_id = 456;
```

**Assertions**:
- ✅ Small size returns smaller price
- ✅ Large size returns larger price
- ✅ Prices match database exactly

---

### Test 3.3: Modifiers Included

**Objective**: Verify modifier prices are added correctly

**Steps**:
1. Submit request with modifiers:
```json
{
  "dish_id": 456,
  "size_code": "default",
  "modifiers": [
    { "modifier_id": 102, "quantity": 1 },  // Ranch +$0.50
    { "modifier_id": 103, "quantity": 2 }   // Extra Cheese +$1.00 x2
  ]
}
```

**Expected Response**:
```json
{
  "base_price": 8.99,
  "modifier_total": 2.50,
  "total_price": 11.49,
  "breakdown": [
    { "item": "Caesar Salad (default)", "price": 8.99 },
    { "item": "Ranch Dressing", "price": 0.50 },
    { "item": "Extra Cheese x2", "price": 2.00 }
  ],
  "currency": "CAD"
}
```

**Assertions**:
- ✅ `modifier_total` is sum of modifier prices
- ✅ `total_price` = `base_price` + `modifier_total`
- ✅ `breakdown` itemizes all selections
- ✅ Quantity multipliers work correctly

---

### Test 3.4: Invalid Dish ID

**Objective**: Verify error handling for non-existent dishes

**Steps**:
1. Submit request with fake dish_id: 999999

**Expected Response**:
```json
{
  "error": "Dish not found"
}
```

**Assertions**:
- ✅ Response status: 404 or 400
- ✅ Error message is clear
- ✅ No server crash

---

## 🧪 Test Suite 4: Modifier Groups CRUD

### Test 4.1: List Modifier Groups (GET /api/menu/dishes/[id]/modifier-groups)

**Objective**: Verify modifier groups fetch correctly

**Steps**:
1. Find dish with modifier groups
2. GET `/api/menu/dishes/{dishId}/modifier-groups`

**Expected Response**:
```json
[
  {
    "id": 789,
    "dish_id": 456,
    "name": "Dressing",
    "display_order": 0,
    "is_required": true,
    "min_selections": 1,
    "max_selections": 1,
    "created_at": "2025-10-31T12:00:00Z",
    "updated_at": "2025-10-31T12:00:00Z"
  }
]
```

**Assertions**:
- ✅ Returns array (not null)
- ✅ Uses `modifier_groups` table (not `dish_modifier_groups`)
- ✅ Column names correct: `is_required`, `min_selections`, `max_selections`
- ✅ Ordered by `display_order` ASC

**SQL Verification**:
```sql
-- Confirm table name is correct
SELECT * FROM menuca_v3.modifier_groups
WHERE dish_id = 456
ORDER BY display_order;
```

---

### Test 4.2: Create Modifier Group (POST /api/menu/dishes/[id]/modifier-groups)

**Objective**: Verify new modifier groups can be created

**Steps**:
1. POST `/api/menu/dishes/{dishId}/modifier-groups`:
```json
{
  "name": "Test Size",
  "is_required": true,
  "min_selections": 1,
  "max_selections": 1
}
```

**Expected Response**:
```json
{
  "id": 790,
  "dish_id": 456,
  "name": "Test Size",
  "display_order": 1,
  "is_required": true,
  "min_selections": 1,
  "max_selections": 1,
  "created_at": "2025-10-31T13:00:00Z",
  "updated_at": "2025-10-31T13:00:00Z"
}
```

**Assertions**:
- ✅ Response status: 200
- ✅ Returns created group with `id`
- ✅ `display_order` auto-incremented
- ✅ Timestamps populated
- ✅ Data inserted into `modifier_groups` table

**Cleanup**:
```sql
DELETE FROM menuca_v3.modifier_groups WHERE id = 790;
```

---

### Test 4.3: Update Modifier Group (PATCH /api/menu/dishes/[id]/modifier-groups/[groupId])

**Objective**: Verify modifier groups can be updated

**Steps**:
1. PATCH `/api/menu/dishes/{dishId}/modifier-groups/{groupId}`:
```json
{
  "name": "Updated Name",
  "max_selections": 3
}
```

**Expected Behavior**:
- Only specified fields updated
- Other fields remain unchanged
- `updated_at` timestamp refreshed

**Assertions**:
- ✅ Response status: 200
- ✅ Returns updated group
- ✅ Database reflects changes

---

### Test 4.4: Delete Modifier Group (DELETE /api/menu/dishes/[id]/modifier-groups/[groupId])

**Objective**: Verify modifier groups can be deleted

**Steps**:
1. Create test group
2. DELETE `/api/menu/dishes/{dishId}/modifier-groups/{groupId}`
3. Verify deletion

**Expected Response**:
```json
{
  "success": true
}
```

**Assertions**:
- ✅ Response status: 200
- ✅ Group no longer in database
- ✅ Cascade deletes modifiers (if applicable)

---

### Test 4.5: Reorder Groups (POST /api/menu/dishes/[id]/modifier-groups/reorder)

**Objective**: Verify drag-drop reordering works

**Steps**:
1. POST `/api/menu/dishes/{dishId}/modifier-groups/reorder`:
```json
{
  "group_ids": [789, 790, 791]
}
```

**Expected Behavior**:
- `display_order` updated: 789→0, 790→1, 791→2
- Transaction ensures atomicity

**Assertions**:
- ✅ Response status: 200
- ✅ All groups reordered correctly
- ✅ No partial updates (transaction rollback if error)

**SQL Verification**:
```sql
SELECT id, name, display_order
FROM menuca_v3.modifier_groups
WHERE dish_id = 456
ORDER BY display_order;
```

---

## 🔍 Integration Testing Strategy

### Manual Testing (Recommended First)
1. Use **Postman** or **curl** to test each endpoint
2. Verify responses match expected schemas
3. Check Supabase database directly after mutations
4. Test edge cases (empty arrays, null values, invalid IDs)

### Automated Testing (Future)
```typescript
// Example with Playwright + API Testing
import { test, expect } from '@playwright/test';

test('GET /api/customer/restaurants/[slug]/menu returns valid structure', async ({ request }) => {
  const response = await request.get('/api/customer/restaurants/test-slug/menu?language=en');
  expect(response.status()).toBe(200);
  
  const menu = await response.json();
  expect(menu).toHaveProperty('restaurant_id');
  expect(menu).toHaveProperty('courses');
  expect(Array.isArray(menu.courses)).toBe(true);
  
  // Verify refactored schema usage
  if (menu.courses.length > 0 && menu.courses[0].dishes.length > 0) {
    const dish = menu.courses[0].dishes[0];
    expect(dish).toHaveProperty('prices');
    expect(Array.isArray(dish.prices)).toBe(true);
    expect(dish).not.toHaveProperty('base_price'); // Deprecated field
  }
});
```

---

## ✅ Success Criteria

All tests must pass before considering integration complete:

| Test Suite | Tests | Pass Criteria |
|------------|-------|---------------|
| Customer Menu | 3 | All menu structures match refactored schema |
| Validation | 4 | All validation rules enforced correctly |
| Price Calculation | 4 | Prices calculated accurately with modifiers |
| Modifier Groups CRUD | 5 | All CRUD operations work against `modifier_groups` table |

**Overall Status**: ⏳ **Pending Execution** (requires Supabase access)

---

## 🚨 Known Limitations

1. **No Direct Supabase Access**: Replit agent cannot directly query Supabase database
2. **Environment-Specific**: Tests must run in environment with Supabase credentials
3. **Data Dependency**: Tests require specific restaurant/menu data to exist

---

## 📞 Next Steps

1. **Execute Test Plan**: Run all tests against Supabase-backed API routes
2. **Document Results**: Record pass/fail for each test
3. **Fix Issues**: Address any failing tests or schema misalignments
4. **Automate**: Convert manual tests to Playwright E2E tests

---

**Last Updated**: October 31, 2025  
**Maintained By**: Replit Agent (Phase 11 Integration)  
**Status**: Ready for execution by team with Supabase access
