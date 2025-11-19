# 🚀 MenuCA V3 - Frontend Build: START HERE
## Critical Pre-Build Review & Handoff

**Created:** October 21, 2025  
**Status:** 🔴 GAPS IDENTIFIED - FIX BEFORE BUILDING  
**Reviewed By:** Cognition Wheel (Claude Opus + Gemini 2.0 + GPT-4)

---

## 🚨 CRITICAL: READ THIS FIRST

**The Cognition Wheel AI review found MAJOR GAPS in our build plan.**

**DO NOT start building until these are addressed!**

---

## ❌ CRITICAL GAPS FOUND

### **1. BUSINESS LOGIC GAPS (Must Fix)**

#### **Gap #1: Real-Time Inventory Missing** 🔴
**Problem:** What happens when an item runs out while in customer's cart?

**Impact:** Orders will fail, customers frustrated, restaurants can't "86" items

**Fix Required:**
```typescript
// Add to backend:
CREATE TABLE menuca_v3.dish_inventory (
  dish_id BIGINT PRIMARY KEY,
  is_available BOOLEAN DEFAULT TRUE,
  unavailable_until TIMESTAMPTZ,
  reason TEXT  -- 'out_of_stock', 'prepping', '86ed'
)

// Add SQL function:
CREATE FUNCTION check_cart_availability(p_cart_items JSONB)
RETURNS JSONB AS $$
  -- Verify all items still available
  -- Return list of unavailable items
$$

// Frontend: Check before checkout
const { data: availability } = await supabase
  .rpc('check_cart_availability', { 
    p_cart_items: cartItems 
  })

if (!availability.all_available) {
  // Show warning: "Pizza Margherita is no longer available"
  // Remove from cart or suggest alternatives
}
```

**Priority:** 🔴 CRITICAL - Must have before Phase 5

---

#### **Gap #2: Guest Checkout Missing** 🔴
**Problem:** Plan forces account creation. This kills conversion rates!

**Impact:** 50%+ of users abandon cart rather than create account

**Fix Required:**
```typescript
// Add to checkout flow:
1. Guest checkout option
2. Collect: name, email, phone (for order updates)
3. Create "guest" user record or use session ID
4. After order, offer "Save this as an account?"

// Update orders table:
ALTER TABLE menuca_v3.orders
  ADD COLUMN is_guest_order BOOLEAN DEFAULT FALSE,
  ADD COLUMN guest_email VARCHAR(255),
  ADD COLUMN guest_phone VARCHAR(20);

// Allow orders without user_id FK (use guest fields instead)
```

**Priority:** 🔴 CRITICAL - Must have for Phase 4 (Checkout)

---

#### **Gap #3: Complex Modifiers Handling** 🟡
**Problem:** Plan says "modifiers" but doesn't handle:
- Required choices (pick a size, pick a protein)
- Multi-select with limits (pick 3 toppings)
- Nested modifiers (if you pick "burrito", then pick a rice)
- Conditional pricing (extra guac costs $2)

**Fix Required:**
```typescript
// Update data model:
interface DishModifierGroup {
  id: number
  name: string
  is_required: boolean
  min_selections: number
  max_selections: number
  modifiers: Modifier[]
}

interface Modifier {
  id: number
  name: string
  price: number
  is_default: boolean
  requires_modifier_group_id?: number  // Nested modifiers
}

// Validation function:
function validateModifierSelections(
  dish: Dish, 
  selectedModifiers: number[]
): ValidationResult {
  // Check required groups have selections
  // Check min/max selection limits
  // Calculate total price including modifiers
}
```

**Priority:** 🟡 HIGH - Needed for Phase 2 (Menu Display)

---

#### **Gap #4: Order Cancellation & Refunds** 🟡
**Problem:** No flow for canceling orders or processing refunds

**Impact:** Customer service nightmare, manual refunds

**Fix Required:**
```typescript
// Add cancellation policy:
- Can cancel if status = 'pending' (before restaurant accepts)
- Cannot cancel once status = 'preparing'
- Auto-refund via Stripe if eligible

// Backend function:
CREATE FUNCTION cancel_customer_order(
  p_order_id BIGINT,
  p_cancellation_reason TEXT
) RETURNS JSONB AS $$
  -- Check if cancellable (status = 'pending')
  -- Process Stripe refund
  -- Update order status to 'cancelled'
  -- Send notification to restaurant
$$

// Frontend:
<Button onClick={cancelOrder} disabled={!canCancel}>
  Cancel Order
</Button>
```

**Priority:** 🟡 HIGH - Add to Phase 6 (Account)

---

#### **Gap #5: Tips, Discounts, Loyalty** 🟢
**Problem:** Not mentioned in plan

**Impact:** Missing revenue features

**Fix Required:**
```typescript
// Tips (for delivery orders):
- Show tip options: 15%, 18%, 20%, Custom
- Add to order total
- Store in orders.driver_tip

// Coupons:
- Already have promotional_coupons table
- Just need UI to apply code
- Validate on server before checkout

// Loyalty:
- Phase 2 feature, defer for now
- But add points tracking to users table
```

**Priority:** 🟢 MEDIUM - Tips for Phase 4, Loyalty for V2

---

### **2. SECURITY GAPS (Must Fix)**

#### **Gap #6: Server-Side Price Validation Missing** 🔴
**Problem:** Plan trusts client-side cart total for payment!

**Impact:** Users can modify JavaScript and pay $0.01 for orders

**Fix Required:**
```typescript
// ❌ WRONG (current plan):
const { clientSecret } = await fetch('/api/create-payment-intent', {
  body: JSON.stringify({
    amount: cartTotal  // ❌ Client sends amount!
  })
})

// ✅ CORRECT:
const { clientSecret } = await fetch('/api/create-payment-intent', {
  body: JSON.stringify({
    items: cartItems  // Send items, server calculates!
  })
})

// Backend MUST recalculate:
export async function POST(request) {
  const { items, restaurantId } = await request.json()
  
  // ✅ Recalculate server-side:
  const { data } = await supabase.rpc('calculate_order_total', {
    p_items: items,
    p_restaurant_id: restaurantId
  })
  
  // Use SERVER total, not client total!
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(data.total * 100),  // Server calculated!
    ...
  })
}
```

**Priority:** 🔴 CRITICAL - Phase 5 (Payment) blocker

---

#### **Gap #7: Rate Limiting Missing** 🟡
**Problem:** No rate limiting on public endpoints

**Impact:** DDoS attacks, brute force, API abuse

**Fix Required:**
```typescript
// Add to middleware.ts:
import rateLimit from '@/lib/rate-limit'

export async function middleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for')
  
  // 100 requests per 15 minutes per IP
  const { success } = await rateLimit.check(ip, {
    limit: 100,
    window: '15m'
  })
  
  if (!success) {
    return new Response('Too many requests', { status: 429 })
  }
}
```

**Priority:** 🟡 HIGH - Add to Phase 8 (Polish)

---

#### **Gap #8: CSP, CSRF, Security Headers** 🟡
**Problem:** No Content Security Policy or CSRF protection

**Fix Required:**
```typescript
// Add to next.config.js:
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com;"
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      }
    ]
  }
}

// CSRF tokens for forms:
import { csrf } from '@/lib/csrf'

export async function POST(request) {
  await csrf.verify(request)  // Verify CSRF token
  // ... process request
}
```

**Priority:** 🟡 HIGH - Add to Phase 8 (Security)

---

### **3. TECHNICAL GAPS (Must Clarify)**

#### **Gap #9: State Management Strategy Unclear** 🟡
**Problem:** Plan uses both Zustand AND React Query - potential conflicts

**Impact:** Data synchronization bugs, stale data

**Fix Required:**

**Document clear separation:**
```typescript
// ✅ Zustand: ONLY for ephemeral UI state
const useCartStore = create({
  items: [],          // ✅ Local cart (before submission)
  isDrawerOpen: false // ✅ UI state
})

// ✅ React Query: ONLY for server data
const { data: restaurant } = useQuery({
  queryKey: ['restaurant', slug],
  queryFn: () => fetchRestaurant(slug)  // ✅ Server data
})

// ❌ NEVER duplicate server data in Zustand!
// ❌ NEVER put ephemeral UI state in React Query!
```

**Create file:** `/docs/STATE_MANAGEMENT_RULES.md`

**Priority:** 🟡 HIGH - Clarify in Phase 1

---

#### **Gap #10: SEO Strategy Missing** 🟢
**Problem:** No SEO mentioned for customer-facing pages

**Impact:** Restaurants won't be found in Google

**Fix Required:**
```typescript
// Restaurant pages: Use SSG or ISR
export const revalidate = 300  // Revalidate every 5 minutes

export async function generateMetadata({ params }) {
  const restaurant = await getRestaurant(params.slug)
  
  return {
    title: `${restaurant.name} - Order Online | MenuCA`,
    description: restaurant.description,
    openGraph: {
      images: [restaurant.banner_url]
    }
  }
}

// Add JSON-LD structured data:
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "{restaurant.name}",
  "address": {...},
  "servesCuisine": [...],
  "hasMenu": "{menuUrl}"
}
</script>
```

**Priority:** 🟢 MEDIUM - Add to Phase 8

---

#### **Gap #11: Image Optimization Strategy** 🟢
**Problem:** 15,740 dish images will kill performance

**Fix Required:**
```typescript
// Use Next.js Image with CDN:
import Image from 'next/image'

<Image
  src={dish.image_url}
  alt={dish.name}
  width={400}
  height={300}
  loading="lazy"
  quality={75}
  placeholder="blur"
/>

// Setup Supabase image transformations:
const imageUrl = supabase.storage
  .from('dish-images')
  .getPublicUrl(dish.image_path, {
    transform: {
      width: 400,
      height: 300,
      resize: 'cover',
      quality: 75
    }
  })
```

**Priority:** 🟢 MEDIUM - Add to Phase 2

---

### **4. PROCESS GAPS (Must Add)**

#### **Gap #12: Testing Strategy Missing** 🔴
**Problem:** NO testing mentioned in 58-task plan!

**Impact:** Bugs in production, broken payment flows

**Fix Required:**

**Add testing tasks to each phase:**
```typescript
// Unit tests (for calculations):
describe('calculateOrderTotal', () => {
  it('calculates subtotal + tax + delivery correctly', () => {
    const total = calculateOrderTotal({
      subtotal: 20.00,
      taxRate: 0.13,
      deliveryFee: 5.00
    })
    expect(total).toBe(27.60)
  })
})

// Integration tests (for APIs):
describe('POST /api/orders', () => {
  it('creates order with valid cart', async () => {
    const response = await POST(mockRequest)
    expect(response.status).toBe(201)
  })
})

// E2E tests (for critical flows):
test('complete checkout flow', async ({ page }) => {
  await page.goto('/r/tonys-pizza')
  await page.click('text=Pepperoni Pizza')
  await page.click('text=Add to Cart')
  await page.click('text=Checkout')
  // ... complete payment
  await expect(page).toHaveURL('/order-confirmation')
})
```

**Add to plan:**
- Phase 2: Unit tests for cart calculations
- Phase 5: Integration tests for payment API
- Phase 7: E2E tests for checkout flow
- Phase 8: Full test suite (90%+ coverage)

**Priority:** 🔴 CRITICAL - Testing is NOT optional!

---

#### **Gap #13: CI/CD Pipeline Missing** 🟡
**Problem:** No mention of automated deployments or checks

**Fix Required:**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
      - run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: vercel deploy --prod
```

**Priority:** 🟡 HIGH - Add before Phase 9 (Launch)

---

#### **Gap #14: Monitoring & Observability** 🟢
**Problem:** No plan for production monitoring

**Fix Required:**
```typescript
// Add error tracking:
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
})

// Add performance monitoring:
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

// Alert on critical errors:
- Failed payments
- Order creation errors
- Supabase connection failures
```

**Priority:** 🟢 MEDIUM - Add to Phase 9 (Launch Prep)

---

## ✅ UPDATED BUILD PLAN

### **Phase 0: Pre-Build Fixes (NEW - 2 days)** 🔴

**Must complete BEFORE Phase 1:**

- [ ] Add `dish_inventory` table for real-time availability
- [ ] Create `check_cart_availability()` SQL function
- [ ] Design guest checkout data model
- [ ] Create `calculate_order_total()` server function (for security)
- [ ] Document state management strategy (Zustand vs React Query)
- [ ] Design complex modifier validation logic
- [ ] Add order cancellation policy & function
- [ ] Setup testing framework (Jest + Playwright)

**Deliverables:**
- `PHASE_0_DATABASE_UPDATES.sql`
- `STATE_MANAGEMENT_RULES.md`
- `MODIFIER_VALIDATION_SPEC.md`
- `test/` folder with example tests

---

### **Phase 1: Foundation (Day 1-2)**

**Add to original tasks:**
- [ ] Setup Jest for unit testing
- [ ] Setup Playwright for E2E testing
- [ ] Configure security headers in `next.config.js`
- [ ] Document state management separation
- [ ] Add rate limiting middleware

---

### **Phase 2: Restaurant Menu Display (Day 3-4)**

**Add to original tasks:**
- [ ] Implement complex modifier groups UI
- [ ] Add modifier validation logic
- [ ] Check dish availability before adding to cart
- [ ] Unit tests for modifier calculations
- [ ] Image optimization with Next.js Image

---

### **Phase 3: Cart System (Day 5)**

**Add to original tasks:**
- [ ] Guest cart handling (without auth)
- [ ] Real-time availability check before checkout
- [ ] Unit tests for cart calculations
- [ ] Cart persistence for guests (localStorage)

---

### **Phase 4: Checkout Flow (Day 6-7)**

**Add to original tasks:**
- [ ] **Guest checkout flow** (no account required!)
- [ ] Tip selection UI
- [ ] Coupon application with server validation
- [ ] "Create account after order" prompt
- [ ] Integration tests for checkout API

---

### **Phase 5: Payment Integration (Day 8-9)**

**Add to original tasks:**
- [ ] **Server-side total calculation** (security!)
- [ ] Server-side cart validation
- [ ] Never trust client-sent prices
- [ ] Payment intent with server-calculated amount
- [ ] Integration tests for payment flow

---

### **Phase 6: Customer Account (Day 10-11)**

**Add to original tasks:**
- [ ] Convert guest orders to account
- [ ] Order cancellation UI
- [ ] Refund request handling
- [ ] Unit tests for cancellation logic

---

### **Phase 7: Order Tracking (Day 12)**

**No major changes**

---

### **Phase 8: Polish & Testing (Day 13-14)**

**Add to original tasks:**
- [ ] Full E2E test suite
- [ ] 90%+ test coverage
- [ ] SEO metadata for all pages
- [ ] JSON-LD structured data
- [ ] Rate limiting verification
- [ ] Security header audit
- [ ] Performance optimization
- [ ] Image lazy loading

---

### **Phase 9: Launch Prep (Day 15-16)** (Extended!)

**Add to original tasks:**
- [ ] Setup Sentry error tracking
- [ ] Setup Vercel Analytics
- [ ] Configure alerts (failed payments, errors)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated deployment to staging
- [ ] Load testing (simulate 100 concurrent users)
- [ ] Security audit
- [ ] Legal pages (Terms, Privacy, Refund Policy)

---

## 🎯 RECOMMENDED APPROACH

### **Option 1: Fix Gaps First, Then Build** ✅ RECOMMENDED

```
Week 1: Fix Critical Gaps
- Days 1-2: Phase 0 (database updates, security)
- Days 3-4: Update CUSTOMER_ORDERING_APP_BUILD_PLAN.md
- Day 5: Review updated plan with team

Week 2-3: Build with Cursor Composer
- Use updated plan
- Build phase-by-phase
- Include testing tasks
```

### **Option 2: Build & Fix in Parallel** ⚠️ RISKY

```
- Start building now
- Fix gaps as you encounter them
- Risk: Rework, delays, security issues
```

**Recommendation:** Take 2 extra days to fix gaps properly. It will save weeks of rework!

---

## 🛠️ TOOLS TO USE

### **Development:**
- ✅ **Cursor** with Supabase MCP
- ✅ **Cursor Composer** for orchestrating multi-file changes
- ✅ Use "Agent" mode for complex features

### **For Each Phase:**
```
1. Read updated plan
2. Use Cursor Composer to scaffold files
3. Implement with AI assistance
4. Write tests
5. Review & iterate
```

---

## 📚 UPDATED DOCUMENTATION NEEDED

**Create these files before building:**

1. **`PHASE_0_DATABASE_UPDATES.sql`**
   - Add dish_inventory table
   - Add guest order fields
   - Add cancellation functions

2. **`STATE_MANAGEMENT_RULES.md`**
   - When to use Zustand
   - When to use React Query
   - Examples of each

3. **`MODIFIER_VALIDATION_SPEC.md`**
   - How to validate required groups
   - How to calculate modifier prices
   - UI patterns for modifiers

4. **`TESTING_STRATEGY.md`**
   - What to unit test
   - What to integration test
   - What to E2E test
   - Coverage goals

5. **`SECURITY_CHECKLIST.md`**
   - Server-side validation rules
   - Rate limiting config
   - Security headers
   - PCI compliance

---

## 🚨 CRITICAL DECISION POINTS

### **Question 1: Guest Checkout?**
**Answer:** YES - Must have! Add to Phase 4

### **Question 2: Real-time Inventory?**
**Answer:** YES - Must have! Add to Phase 0

### **Question 3: Server-side price validation?**
**Answer:** YES - Critical security! Add to Phase 5

### **Question 4: Testing?**
**Answer:** YES - Not optional! Add to all phases

### **Question 5: Start building now?**
**Answer:** NO - Fix Phase 0 gaps first (2 days)

---

## ✅ FINAL RECOMMENDATION

### **DO THIS:**

1. **Spend 2 days on Phase 0** (fix critical gaps)
2. **Update build plan** with new tasks
3. **Setup testing framework**
4. **Then start Phase 1** in Cursor with Composer

### **Timeline:**
- Original: 15 days
- Realistic: **18-20 days** (includes gaps + testing)

### **But:** Product will be secure, scalable, and production-ready!

---

## 🎯 NEXT STEPS

**Immediate actions:**

1. [ ] Review this gap analysis with team
2. [ ] Decide: Fix gaps first OR build and fix?
3. [ ] If fixing first: Create Phase 0 tasks
4. [ ] Update CUSTOMER_ORDERING_APP_BUILD_PLAN.md
5. [ ] Setup testing framework
6. [ ] Then: Start building with Cursor Composer!

---

## 💬 COORDINATOR STANDING BY

**I'm here to help with:**
- Creating Phase 0 database updates
- Writing updated build plan
- Setting up testing framework
- Coordinating Cursor Composer sessions
- Reviewing code as you build

**Just ask!** 🚀

---

**Status:** 🔴 DO NOT BUILD YET - Fix gaps first!  
**Reviewed:** October 21, 2025 by Cognition Wheel  
**Next Review:** After Phase 0 completion

---

**Quality over speed. 2 extra days now = Weeks saved later!**

