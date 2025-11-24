# AGENT MEMORY BANK
**Purpose:** Critical knowledge for AI agents working on Menu.ca Admin Dashboard  
**Last Updated:** November 20, 2025  
**Read This FIRST Before Any Work**

---

## ⚠️⚠️⚠️ STOP! READ THIS FIRST ⚠️⚠️⚠️

### DATABASE IS SUPABASE - NOT REPLIT!!!

**BEFORE doing ANYTHING with databases:**
1. ✅ This project uses **SUPABASE PostgreSQL** (NOT Replit database)
2. ⚠️ CRITICAL: ALL TABLES ARE IN menuca_v3 SCHEMA ⚠️
   - Admin tables: menuca_v3.admin_users, menuca_v3.admin_roles
   - Restaurant data: menuca_v3.restaurants, menuca_v3.dishes, etc.
   - There is NO public schema in use
   - If you see public.admin_users or public.anything - IT IS WRONG
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

## 🎨 Branding System (Nov 20, 2025)

### Overview
Complete branding control for restaurant menu pages with advanced customization options.

### Features
1. **Logo Upload** → `restaurant-logos` bucket (Supabase Storage)
2. **Banner Image Upload** → `restaurant-images` bucket (header/hero image)
3. **Primary Color** → Main brand color for buttons, links, accents
4. **Secondary Color** → Backgrounds and highlights
5. **Font Family** → Google Fonts selection (10 fonts available)
6. **Button Style** → Rounded or square corners
7. **Menu Layout** → Grid or list view for menu items

### Database Schema
```sql
-- Branding columns in restaurants table (menuca_v3 schema)
logo_url           TEXT
banner_image_url   TEXT
primary_color      VARCHAR(7) DEFAULT '#000000'
secondary_color    VARCHAR(7) DEFAULT '#666666'
font_family        VARCHAR(100) DEFAULT 'Inter'
button_style       VARCHAR(20) DEFAULT 'rounded' CHECK (button_style IN ('rounded', 'square'))
menu_layout        VARCHAR(20) DEFAULT 'grid' CHECK (menu_layout IN ('grid', 'list'))
```

### How It Works
1. **Admin edits branding:** Branding tab → Update fields → Save
2. **Files uploaded to:** Supabase Storage (restaurant-logos or restaurant-images buckets)
3. **Colors converted to HSL:** Using `hexToHSL()` utility function
4. **Applied to customer menu:** Injected as CSS variables (`--primary`, `--ring`)
5. **Dynamic styling:** Menu page adapts to all branding settings

### Files Involved
- `components/restaurant/tabs/branding.tsx` - Admin UI with live preview
- `components/customer/restaurant-menu.tsx` - Customer menu page with banner rendering
- `lib/validations/restaurant.ts` - Validation schema for branding fields
- `app/api/storage/upload/route.ts` - File upload handler (supports both buckets)
- `app/api/restaurants/[id]/route.ts` - PATCH endpoint for updates
- `lib/utils.ts` - `hexToHSL()` conversion function
- `app/(public)/r/[slug]/page.tsx` - Injects CSS variables for customer view
- `db/migrations/add_advanced_branding_columns.sql` - Migration for new columns

### Banner Image Specifications
- **Height (Responsive):** `h-20 sm:h-24 md:h-32` (80px mobile → 96px tablet → 128px desktop)
- **Preview Height:** `h-32` (128px) in admin branding preview
- **Styling:** `object-cover` with `overflow-hidden` for proper image scaling
- **Recommended Size:** 1920x400px (will be cropped to fit responsive heights)

### Responsive Design (Nov 24, 2025)
**Mobile-First Approach:**
- Banner scales down on mobile (h-20) to save screen space
- Logo responsive: `w-10 sm:w-12` (40px → 48px)
- Restaurant name: `text-xl sm:text-2xl md:text-3xl`
- Dish cards stack vertically on mobile (`flex-col sm:flex-row`)
- Dish images: Full width on mobile, fixed width on tablet+
- Price/name stack on mobile to prevent text cutoff
- Tighter padding on mobile: `px-3 sm:px-4`
- Service badges abbreviated on mobile ("Delivery" vs "Delivery Available")

### Storage Buckets
- `restaurant-logos` - Logo images (512x512px recommended)
- `restaurant-images` - Banner/header images (1920x400px recommended)
- Both buckets have public read access with RLS policies

### Preview System
Live preview shows:
- Banner image at top
- Logo with restaurant name
- Color swatches with hex values
- Button style examples (rounded vs square)
- Menu layout examples (grid vs list)
- Typography sample with selected font

### Testing
1. Go to restaurant in admin → Branding tab
2. Upload logo and banner images
3. Select colors using color pickers
4. Choose font, button style, and menu layout
5. Click "Show Preview" to see live preview
6. Save changes
7. Visit customer menu `/r/restaurant-slug-id`
8. Verify all branding is applied correctly

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

## 🔄 Recent Fixes (Nov 24, 2025)

### Card Scanning & Save Card Features (Payment Form)
**Problem:** Manual card entry only, no quick scan option, cards not saved for future use
**Solution:** Added GrabFood-style card scanning UI and Stripe card saving functionality
**Details:**
- **Scan Card Button:** Prominent "Scan Card for Quick Entry" with camera icon
- **Scanning Modal:** Full-screen with camera preview placeholder, card frame overlay, tips
- **Save Card Checkbox:** Only for logged-in users, Shield icon, security messaging
- **Visual Hierarchy:** "Or enter manually" divider between scan and form
- **Professional UX:** Ready for OCR integration (requires camera library)
- **Backend Ready:** Code prepared for Stripe setup_future_usage integration
**Technical:** Camera access + OCR library needed for full implementation
**Commit:** `2cd3cbc`

### Checkout Sign-In UX Improvements
**Problem:** After sign-in, UI didn't update - sign-in button still showing, no saved addresses visible
**Solution:** Enhanced auth state tracking, added welcome message, redesigned saved addresses as cards
**Details:**
- **Debug Logging:** Added comprehensive console logs to track auth flow
- **Welcome Message:** "Welcome back, [Name]! 👋" greeting after login
- **Card-Style Addresses:** Selectable cards with borders, icons, checkmarks (Grab/UberEats style)
- **No Addresses State:** Prominent empty state with "Add Your First Address" CTA
- **Guest Prompt:** Enhanced sign-in prompt with primary color accent
- **Better Feedback:** Toast notification "Loading your saved addresses..." after login
**Commit:** `8ffe88d`

### Category Navigation & Sticky Footer Cart Bar
**Problem:** Category navigation missing for customers, cart button small and hard to see  
**Solution:** Restored category tabs and redesigned cart as full-width sticky footer  
**Details:**
- **Category Nav:** Changed from editorMode-only to customer-facing (!editorMode)
- **Horizontal Scroll:** Categories appear as scrollable tabs at top of menu
- **Sticky Footer Cart:** Full-width bar at bottom showing "Basket • X Items" + total
- **Always Visible:** Cart footer now always visible (even when empty at $0.00)
- **Dynamic Text:** Button shows "Place Order" when cart drawer is open with items
- **Debug Logging:** Added console logs to track cart additions and updates
- **Bottom Padding:** Added pb-24 to menu container to prevent content hiding
- **Better UX:** Quick category navigation + persistent cart visibility
**Commits:** `a86ce38`, `926b8a7`

### No-Image-First Design & Button Overflow Fix
**Problem:** 80x80px placeholder wasted space (80%+ dishes have no images), buttons broke on narrow screens  
**Solution:** Redesigned for no-image-first, image is optional bonus  
**Details:**
- **Removed Placeholder:** No more icon placeholder - saves space for majority case
- **Optional Images:** Only render if dish.image_url exists (64x64px when present)
- **Full-Width Content:** Text uses full width when no image (better readability)
- **Button Fix:** Icon-only on narrow screens, "Add" text appears on sm+, h-8 fixed height
- **Responsive Gaps:** gap-1 sm:gap-2 for tight spacing, flex-shrink-0 prevents crushing
- **Better Overflow:** whitespace-nowrap on price, min-w-0 on name for proper truncation
**Commit:** `6d4db67`

### Compact List Layout Redesign (GrabFood/UberEats Style)
**Problem:** Menu cards wasted space, not optimized for 100+ item menus, poor density  
**Solution:** Complete redesign to professional food delivery app patterns  
**Details:**
- **Dish Cards:** 80x80px fixed images (all screens), always horizontal layout
- **Image Handling:** Rounded-lg, no frame, UtensilsCrossed icon fallback for no-image dishes
- **Multi-Column Grid:** 1→2→3→4 columns responsive (list), 1→2 columns (grid)
- **Respects Branding:** menu_layout setting (list vs grid) from database
- **Modifier Modal:** Hero image at top (full-width), Optional/Required labels, grouped UI
- **Spacing:** Tighter throughout - p-2 sm:p-3 cards, space-y-8 categories, gap-2 sm:gap-3
- **Estimated Impact:** 5-7 dishes visible mobile (was 3-4), 12-20 desktop (was 8-10)
**Commit:** `859cd7b`
**Note:** Improved in `6d4db67` with no-image-first design

### Responsive Design Overhaul
**Problem:** Menu page layout broke on mobile - text cutoff, cramped spacing, poor usability  
**Solution:** Implemented comprehensive mobile-first responsive design  
**Details:**
- Banner: Responsive height (h-20 → h-24 → h-32) saves mobile screen space
- Dish cards: Changed from horizontal-only to vertical stacking on mobile
- Critical fix: Dish image now full-width on mobile (was fixed 128px causing text cutoff)
- Price/name stack vertically on mobile (was side-by-side causing overflow)
- Logo scales down: w-10 on mobile, w-12 on desktop
- Restaurant name responsive: text-xl → text-2xl → text-3xl
- Tighter padding throughout on mobile (px-3 vs px-4)
- Service badges stack vertically and use shorter text on mobile
**Commit:** `80417ee`
**Note:** Superseded by compact list layout redesign

### Banner Image Implementation (Nov 21, 2025)
**Problem:** Banner images were stored in database but not displayed on customer menu page  
**Solution:** Added banner image rendering to customer menu page  
**Details:**
- Banner displays at top of menu page when `banner_image_url` is set
- Initial height set to `h-32` (128px), later made responsive
- Uses `object-cover` for proper image scaling
- Updated admin preview to match customer-facing height
**Commit:** `7c02d57`

---

**Remember:** This is a REAL production app with LIVE data. Take time to understand before changing. When in doubt, ASK or CHECK the schema first!

---

**Last Updated By:** Cursor Agent (CSS Agent)  
**Next Update:** After next feature implementation

