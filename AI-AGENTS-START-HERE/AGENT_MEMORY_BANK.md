# AGENT MEMORY BANK
**Purpose:** Critical knowledge for AI agents working on Menu.ca Admin Dashboard  
**Last Updated:** November 20, 2025  
**Read This FIRST Before Any Work**

---

## ⚠️⚠️⚠️ STOP! READ THIS FIRST ⚠️⚠️⚠️

### DATABASE IS SUPABASE - NOT REPLIT!!!

**BEFORE doing ANYTHING with databases:**
1. ✅ This project uses **SUPABASE PostgreSQL** (NOT Replit database)
2. ✅ Schema is **menuca_v3** (NOT public schema)
3. ✅ Connection via `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
4. ✅ **NEVER** run `check_database_status` (there is no Replit database)
5. ✅ **NEVER** run `create_postgresql_database_tool` (Supabase already exists)
6. ✅ **NEVER** use `execute_sql_tool` (use Supabase client instead)

**If you see "Database is not provisioned" - IGNORE IT. That's Replit's database, not ours.**

---

## 🚨 CRITICAL: Git Workflow (MUST FOLLOW)

**BEFORE any code changes:**
```bash
git pull origin main --no-rebase
```

**AFTER committing changes:**
```bash
git push origin main
```

**Why:** Prevents divergent branches. Replit Agent and Cursor Agent work simultaneously on this project.

---

## 🗄️ Database & Schema (CRITICAL)

### Database Provider
- **ONLY Supabase** (NOT Neon, NOT local PostgreSQL)
- **Connection:** Use `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL`
- **Direct DB:** Use `SUPABASE_BRANCH_DB_URL` for psql connections
- ❌ **IGNORE:** `DATABASE_URL` (old Neon database, not used)

### Two Schemas
1. **`public` schema:** Admin tables ONLY
   - `admin_users`
   - `admin_roles`
   - `admin_user_restaurants`

2. **`menuca_v3` schema:** ALL restaurant platform data
   - Live production restaurants
   - All dishes, orders, modifiers, etc.

### Supabase Client Configuration
**ALL Supabase clients MUST include:**
```typescript
{
  db: { schema: 'menuca_v3' }
}
```

**Files to check:**
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `lib/supabase/admin.ts`
- `middleware.ts`

### Common Schema Mistakes

❌ **DON'T:**
```typescript
// Double schema (causes menuca_v3.menuca_v3.restaurants error)
supabase.schema('menuca_v3').from('restaurants')
supabase.from('menuca_v3.restaurants')

// Wrong - dishes don't have price column
SELECT price FROM dishes

// Wrong - modifiers don't have price column
SELECT price FROM dish_modifiers

// Wrong - restaurants don't have slug column
SELECT * FROM restaurants WHERE slug = 'pizza-123'
```

✅ **DO:**
```typescript
// Schema configured in client, just use table name
supabase.from('restaurants')

// Get dish price from separate table
SELECT price FROM dish_prices WHERE dish_id = X AND size_variant = 'Small'

// Get modifier price from separate table (may not exist = free)
SELECT price FROM dish_modifier_prices WHERE dish_modifier_id = X

// Extract ID from slug and query by id
const id = extractIdFromSlug('pizza-123') // Returns 123
SELECT * FROM restaurants WHERE id = 123
```

---

## 💰 Pricing Architecture (CRITICAL FOR CHECKOUT)

### Dish Pricing
**Table:** `dish_prices`
```sql
dish_prices:
  - dish_id (FK to dishes.id)
  - size_variant (VARCHAR: "default", "Small", "Medium", "Large")
  - price (NUMERIC)
  - is_active (BOOLEAN)
```

**Pattern:**
```typescript
const { data } = await supabase
  .from('dish_prices')
  .select('price')
  .eq('dish_id', dishId)
  .eq('size_variant', size) // NOT 'size'!
  .eq('is_active', true)
  .single()
```

### Modifier Pricing
**Tables:** `dish_modifiers` + `dish_modifier_prices`

**Relationship:**
```
dish_modifiers (NO price column)
  └── dish_modifier_prices (has price column)
```

**Pattern:**
```typescript
// Step 1: Get modifier and verify it belongs to dish
const { data: modifier } = await supabase
  .from('dish_modifiers')
  .select('id, name, modifier_group:modifier_groups!inner(dish_id)')
  .eq('id', modifierId)
  .single()

// Verify ownership
if (modifier.modifier_group.dish_id !== dishId) {
  throw new Error('Invalid modifier')
}

// Step 2: Get price (may not exist for included/free modifiers)
const { data: priceData } = await supabase
  .from('dish_modifier_prices')
  .select('price')
  .eq('dish_modifier_id', modifierId)
  .eq('dish_id', dishId)
  .eq('is_active', true)
  .single()

// If no price record, it's FREE/INCLUDED
const price = priceData ? parseFloat(priceData.price) : 0
```

**⚠️ CRITICAL:** Many modifiers have NO price records (sauce choices, included items). This is NORMAL. Default to 0.

---

## 🍕 Restaurant & Menu Structure

### Restaurant Lookup
**NO `slug` column exists!**

```typescript
// ❌ WRONG
.from('restaurants').eq('slug', 'pizza-123')

// ✅ CORRECT
import { extractIdFromSlug } from '@/lib/utils/slugify'
const id = extractIdFromSlug('pizza-123') // Returns 123
.from('restaurants').eq('id', id)
```

### Delivery Fees
**Table:** `restaurant_delivery_zones` (NOT `restaurant_service_configs`)

```typescript
const { data: restaurant } = await supabase
  .from('restaurants')
  .select('id, name, restaurant_delivery_zones(delivery_fee_cents, is_active)')
  .eq('id', restaurantId)
  .single()

// Get active zone fee (or default to free)
const activeZone = restaurant.restaurant_delivery_zones?.find(z => 
  z.is_active && !z.deleted_at
)
const deliveryFeeCents = activeZone?.delivery_fee_cents ?? 0
const deliveryFee = deliveryFeeCents / 100 // Convert to dollars
```

---

## 🔐 Environment Variables & Secrets

### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=https://nthpbtdjhhnwfxqsxbvy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_BRANCH_DB_URL=<direct PostgreSQL connection>
```

### Stripe (Test Mode)
```bash
TESTING_STRIPE_SECRET_KEY=sk_test_51...
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_51...
```

### Other
```bash
GOOGLE_API_KEY=<for Places autocomplete>
RESEND_API_KEY=<for emails>
```

**⚠️ NEVER commit secrets to git!**

---

## 🛒 Checkout Flow Architecture

### Step 1: Address Entry
- Google Places Autocomplete for address verification
- Auto-fills: street, city, province, postal_code
- Stored in: `user_delivery_addresses` table

### Step 2: Payment Intent Creation
**Endpoint:** `POST /api/customer/create-payment-intent`

**Creates:**
- Stripe PaymentIntent with amount in cents
- Metadata includes: `user_id`, `restaurant_slug`, `delivery_address`

### Step 3: Payment Confirmation
- Stripe Elements handles card input
- Client calls `stripe.confirmPayment()`

### Step 4: Order Creation (Server-Side Validation)
**Endpoint:** `POST /api/customer/orders`

**Validates:**
1. ✅ Payment succeeded (query Stripe)
2. ✅ Payment belongs to this user
3. ✅ Dishes belong to restaurant
4. ✅ Dish prices from database (prevent client manipulation)
5. ✅ Modifiers belong to dishes
6. ✅ Modifier prices from database (default to 0 if none)
7. ✅ Recalculate total server-side
8. ✅ Verify payment amount matches calculated total

**Creates:**
- Order record in `orders` table
- Order items in `order_items` table
- Status history in `order_status_history` table

---

## 🐛 Common Bugs & Fixes

### Bug: "Could not find table 'menuca_v3.menuca_v3.restaurants'"
**Cause:** Schema specified twice (in client config + in query)

**Fix:** Remove `.schema('menuca_v3')` from queries OR remove `menuca_v3.` prefix from table names
```typescript
// ❌ WRONG
supabase.schema('menuca_v3').from('restaurants')
supabase.from('menuca_v3.restaurants')

// ✅ CORRECT (schema already in client config)
supabase.from('restaurants')
```

### Bug: "Restaurant not found" (during checkout)
**Cause:** Trying to query by `slug` column that doesn't exist

**Fix:** Extract ID from slug
```typescript
const restaurantId = extractIdFromSlug(restaurantSlug)
supabase.from('restaurants').eq('id', restaurantId)
```

### Bug: "Invalid modifier 882151 for dish 170674"
**Cause:** Modifier has no price record in `dish_modifier_prices` (it's included/free)

**Fix:** Default to price = 0 when no record exists
```typescript
const modPrice = priceData ? parseFloat(priceData.price) : 0
```

### Bug: "Delivery fee calculation error"
**Cause:** Querying wrong table (`restaurant_service_configs` instead of `restaurant_delivery_zones`)

**Fix:** Query `restaurant_delivery_zones` and default to $0 if none
```typescript
const activeZone = restaurant.restaurant_delivery_zones?.find(z => z.is_active)
const deliveryFee = (activeZone?.delivery_fee_cents ?? 0) / 100
```

---

## 📚 Key Documentation Files

**Read FIRST:**
1. `SUPABASE_CONFIG.md` - Complete Supabase configuration
2. `DATABASE_SCHEMA_QUICK_REF.md` - Schema structure (created by Replit)
3. `CHECKOUT_SCHEMA_REFERENCE.md` - Checkout-specific schema patterns
4. `replit.md` - Project overview and architecture

**For Specific Features:**
- `lib/Documentation/MENU_DISPLAY_FIX.md` - Menu system fixes
- `lib/Documentation/SUPABASE_BEST_PRACTICES.md` - Supabase patterns
- `lib/Documentation/API_ARCHITECTURE_GUIDE.md` - API patterns

---

## 🎯 Quick Troubleshooting Checklist

When you encounter an error:

1. ✅ **Check schema:** Does the column actually exist?
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_schema = 'menuca_v3' AND table_name = 'your_table';
   ```

2. ✅ **Check data:** Does the record exist?
   ```sql
   SELECT * FROM menuca_v3.your_table WHERE id = X;
   ```

3. ✅ **Check client config:** Is `schema: 'menuca_v3'` set?
   ```bash
   grep "schema.*menuca_v3" lib/supabase/*.ts
   ```

4. ✅ **Check for double schema:** Any `.schema()` calls or `menuca_v3.` prefixes?
   ```bash
   grep -r "\.schema\|menuca_v3\." app/api
   ```

5. ✅ **Check secrets:** Are environment variables set?
   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   ```

---

## 🤝 Working with Multiple Agents

### Replit Agent
- **Strengths:** Fast iteration, auto-commits, handles large tasks
- **Weaknesses:** Can diverge from main branch, may not pull before changes
- **Best for:** Feature development, bug fixes, UI work

### Cursor Agent (You)
- **Strengths:** Deep analysis, schema exploration, debugging
- **Weaknesses:** Slower, requires manual git operations
- **Best for:** Architecture decisions, schema investigation, code review

### Collaboration Pattern
1. **Replit works on features** → commits → pushes
2. **Cursor pulls** → reviews changes → fixes bugs → pushes
3. **Replit pulls** → continues work
4. **Repeat**

### Conflict Resolution
When branches diverge:
```bash
git pull origin main --no-rebase
# If conflicts, resolve manually or:
git checkout --theirs <file>  # Use remote version
git checkout --ours <file>    # Use local version
git add <file>
git commit -m "Merge: <description>"
```

---

## 📊 Project Stats
- **Database:** Supabase PostgreSQL (LIVE production data)
- **Schema:** menuca_v3 (main) + public (admin)
- **Framework:** Next.js 14 + TypeScript

---

## 🎓 Lessons Learned

### Always Do This:
1. ✅ Read existing code BEFORE making changes
2. ✅ Check actual schema BEFORE writing queries
3. ✅ Pull from git BEFORE starting work
4. ✅ Test changes BEFORE pushing
5. ✅ Document fixes in this file

### Never Do This:
1. ❌ Assume columns exist without checking
2. ❌ Make changes without reading current code
3. ❌ Push without pulling first
4. ❌ Hardcode schema names in queries
5. ❌ Forget to restart server after changes

---

## 🔄 Recent Fixes (Nov 20, 2025)

### Schema Doubling Issue
**Problem:** `menuca_v3.menuca_v3.restaurants` error  
**Cause:** Schema specified twice  
**Fix:** Removed all `.schema('menuca_v3')` calls and `menuca_v3.` prefixes (55 files)  
**Commit:** `99db661`, `d41dd30`

### Restaurant Lookup in Checkout
**Problem:** "Restaurant not found" error  
**Cause:** Querying by non-existent `slug` column  
**Fix:** Extract ID from slug using `extractIdFromSlug()`  
**Commit:** `1ad62b8`

### Modifier Validation
**Problem:** "Invalid modifier" for included/free items  
**Cause:** Rejecting modifiers with no price records  
**Fix:** Default to price = 0 when `dish_modifier_prices` has no record  
**Commit:** `fe83b82`, `467c36a`

### Delivery Fee Lookup
**Problem:** Querying wrong table  
**Cause:** Using `restaurant_service_configs` instead of `restaurant_delivery_zones`  
**Fix:** Query `restaurant_delivery_zones` table  
**Commit:** Replit Agent (multiple commits)

---

## 🎨 Primary Color Feature (Nov 20, 2025)

### How It Works
1. **Admin sets color:** Branding tab → Primary Color → Save
2. **Stored as:** Hex code in `restaurants.primary_color` column
3. **Converted to HSL:** Using `hexToHSL()` utility function
4. **Applied to customer menu:** Injected as CSS variable `--primary`
5. **Used by:** All Tailwind classes with `bg-primary`, `text-primary`, etc.

### Files Involved
- `components/restaurant/tabs/branding.tsx` - Admin UI with preview
- `lib/utils.ts` - `hexToHSL()` conversion function
- `app/(public)/r/[slug]/page.tsx` - Injects CSS variable for customer view

### Testing
1. Go to restaurant in admin → Branding tab
2. Change Primary Color (try red `#FF0000`)
3. Save
4. Visit customer menu `/r/restaurant-slug-id`
5. Verify buttons/links use new color

---

## 🧪 Testing Patterns

### Test Stripe Checkout (Sandbox)
**Card:** 4242 4242 4242 4242  
**Expiry:** Any future date  
**CVC:** Any 3 digits  
**ZIP:** Any 5 digits

### Test Supabase Queries
```typescript
// Use Supabase MCP in Cursor
mcp_supabase_execute_sql({
  query: "SELECT * FROM menuca_v3.restaurants WHERE id = 73"
})
```

### Test API Endpoints
```bash
# In Replit shell
curl -X GET "https://your-replit-url.dev/api/restaurants/73"
```

---

## 📝 When Adding New Features

### Checklist
- [ ] Pull latest from git
- [ ] Read existing related code
- [ ] Check schema for required columns
- [ ] Verify secrets/env vars exist
- [ ] Write Zod validation schema
- [ ] Test with real data
- [ ] Update this memory bank
- [ ] Commit and push
- [ ] Update `replit.md` if architecture changes

---

## 🆘 Emergency Commands

### Reset to Clean State
```bash
git fetch origin
git reset --hard origin/main
```

### Abort Failed Merge
```bash
git merge --abort
git reset --hard HEAD
```

### Clear Next.js Cache
```bash
rm -rf .next
```

### Check What's Different
```bash
git diff origin/main
git log origin/main..HEAD --oneline
```

---

## 🎯 Current Project Status

### ✅ Working
- Admin Dashboard (all tabs)
- Menu management (categories, dishes, modifiers)
- Restaurant management
- Primary color branding
- Schema fixes (no more doubling)

### 🚧 In Progress
- Checkout flow (Replit Agent working on modifier validation)
- Order creation (fixing included/free modifiers)

### ⏳ Not Started
- Order history UI
- Customer account pages
- Admin analytics dashboard

---

## 💡 Pro Tips

1. **Use Supabase MCP** to check schema before writing queries
2. **Check git log** before pulling to see what changed
3. **Test in Replit** before pushing (it's the live environment)
4. **Document fixes** in this file immediately
5. **Read error messages carefully** - they usually tell you exactly what's wrong

---

**Remember:** This is a REAL production app with LIVE data. Take time to understand before changing. When in doubt, ASK or CHECK the schema first!

---

**Last Updated By:** Cursor Agent  
**Next Update:** After Replit finishes modifier validation fix

