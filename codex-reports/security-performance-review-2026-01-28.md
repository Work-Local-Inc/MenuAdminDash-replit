# Security & Performance Review Handoff
Date: 2026-01-28
Repo: MenuAdminDash-replit
Reviewer: Codex

## Executive Summary
This review identified several **high-risk security issues** centered on publicly accessible debug/test endpoints and webhook verification behavior, plus **opportunities to reduce latency** in order creation and menu rendering. The top priority is to **remove or gate debug endpoints**, **require Stripe webhook signature verification**, and **enforce per-restaurant authorization** on admin/service-role routes. Performance wins are primarily from **reducing sequential DB round-trips**.

## Prioritized Fixes (Highest to Lowest)
### P0 — Immediate Security Fixes
1) **Remove or strictly gate debug/test endpoints** that expose privileged data or device secrets. These currently run without auth and/or with service-role access.
   - Examples: `app/api/debug-data/route.ts`, `app/api/debug-schema/route.ts`, `app/api/check-public-tables/route.ts`, `app/api/test-connection/route.ts`, `app/api/test-auth/route.ts`, `app/api/test-restaurant/route.ts`, `app/api/tablet/debug-device/route.ts`, `app/api/tablet/test-bcrypt/route.ts`.
   - Risk: public data exfiltration, device key validation, schema discovery, operational leakage.

2) **Require Stripe webhook signature verification** and avoid logging secrets.
   - `app/api/customer/stripe-webhook/route.ts` accepts unsigned payloads if `STRIPE_WEBHOOK_SECRET` is missing and logs a key prefix.
   - Risk: anyone can forge payment events if env is misconfigured.

3) **Enforce per-restaurant authorization on admin routes** that use service-role clients.
   - Many restaurant-scoped routes verify admin auth, but do not check that the admin is authorized for the target restaurant ID.
   - Risk: an authenticated admin can read/update other restaurants via IDOR.

### P1 — High-Impact Performance Fixes
4) **Reduce sequential Supabase round-trips in order creation** by batching or using a single RPC.
   - `app/api/customer/orders/route.ts` performs many sequential queries (menu, prices, modifiers, combo graphs). These add latency per order.

5) **Avoid N+1 schema inspection queries** in DB inspector.
   - `app/api/admin/db-inspector/route.ts` queries columns and counts per table; should be optional or batched.

### P2 — Medium/Low Fixes
6) **Public restaurant page caching**: `noStore()` disables caching; consider short revalidate windows and parallelized fetches where safe.
7) **Coupon validation**: reduce multi-query counts and dish lookups by consolidating into a single RPC.

---

## Findings (Details & References)
### Security
- **Public debug/test endpoints:**
  - Unauthenticated + service role / admin access paths:
    - `app/api/debug-data/route.ts`
    - `app/api/test-auth/route.ts`
    - `app/api/test-restaurant/route.ts`
    - `app/api/test-connection/route.ts`
    - `app/api/debug-schema/route.ts`
    - `app/api/check-public-tables/route.ts`
    - `app/api/tablet/debug-device/route.ts`
    - `app/api/tablet/test-bcrypt/route.ts`

- **Webhook verification fallback:**
  - `app/api/customer/stripe-webhook/route.ts` uses `JSON.parse(body)` when `STRIPE_WEBHOOK_SECRET` is missing, and logs the secret key prefix.

- **Restaurant authorization gaps:**
  - Example: `app/api/restaurants/[id]/route.ts` verifies admin auth, then writes directly with service role without checking restaurant assignment.
  - Similar patterns likely exist across restaurant-scoped admin routes (e.g., contacts, images, schedules, domains, delivery-areas, integrations).

- **Credential exposure in docs:**
  - `lib/Documentation/Frontend-Guides/Users-&-Access/Users & Access features.md` contains a cleartext postgres connection string. Treat as secret.

### Performance
- **Order creation route** (`app/api/customer/orders/route.ts`):
  - Multiple sequential queries for menu, dish prices, modifiers, combo modifier prices, combo group links, and sections.
  - Suggest consolidating into a single SQL function (e.g., `get_order_validation_context`) or parallelizing non-dependent queries with `Promise.all`.

- **DB inspector** (`app/api/admin/db-inspector/route.ts`):
  - N+1 for column lists and count queries; could return schema only, and count on-demand.

- **Public restaurant page** (`app/(public)/r/[slug]/page.tsx`):
  - `noStore()` disables caching; large menu logging in prod adds overhead.

---

## Recommended Remediation Plan
### Phase 1 (P0) — Security Hardening
1) **Remove or gate debug/test endpoints**:
   - Wrap with `if (process.env.NODE_ENV !== 'development') return 404` or require `verifyAdminAuth` + feature flag.
   - For tablet debug endpoints: require admin auth + restrict to development or pre-shared support token.

2) **Enforce Stripe webhook signature validation**:
   - Fail closed if `STRIPE_WEBHOOK_SECRET` is missing.
   - Remove logging of key prefixes.

3) **Add restaurant authorization helper**:
   - Use `verifyAdminAuth` to get `adminUser`, then ensure the admin is authorized for the restaurant ID via a shared helper (e.g., `checkAdminRestaurantAccess`).
   - Apply across restaurant-scoped routes.

### Phase 2 (P1) — Performance Improvements
4) **Order creation batching**:
   - Move dish/modifier/price validation and pricing into a single RPC call or a batched SQL function.
   - Use `Promise.all` for independent queries if staying in application code.

5) **DB inspector gating**:
   - Require admin auth (already) and add a query param to optionally compute counts or columns.

### Phase 3 (P2)
6) **Public page caching**:
   - Replace `noStore()` with a short `revalidate` window for branding/menu where acceptable.
   - Remove noisy logs in production builds.

7) **Coupon validation**:
   - Batch usage counts and course lookup into a single function.

---

## Sample Patches (Illustrative)
> These are samples only — adjust to your codebase conventions.

### 1) Gate debug endpoints (example)
```ts
// app/api/debug-data/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  // existing debug code
}
```

### 2) Stripe webhook: fail closed without secret
```ts
// app/api/customer/stripe-webhook/route.ts
if (!webhookSecret) {
  return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
}

// Remove any logging of secret keys
```

### 3) Enforce restaurant authorization
```ts
// lib/auth/restaurant-access.ts (new helper idea)
export async function requireRestaurantAccess(adminUserId: number, restaurantId: number) {
  const authorized = await checkAdminRestaurantAccess(adminUserId, restaurantId)
  if (!authorized) throw new ForbiddenError('Forbidden')
}

// usage in route
const { adminUser } = await verifyAdminAuth(request)
await requireRestaurantAccess(adminUser.id, parseInt(params.id, 10))
```

### 4) Reduce sequential queries (order creation)
```ts
// Example of parallelization
const [menuResp, pricesResp] = await Promise.all([
  fetchMenuForCustomer(adminSupabase, restaurant.id, 'en'),
  adminSupabase.schema('menuca_v3').from('dish_prices')
    .select('dish_id, size_variant, price')
    .in('dish_id', dishIds)
    .eq('is_active', true)
])
```

---

## Suggested Tests
- Verify debug endpoints are unreachable in production.
- Stripe webhook rejects unsigned requests when secret missing.
- Admin from Restaurant A cannot modify Restaurant B via API.
- Order creation latency before/after batching changes.

---

## Notes
- No code changes were applied in this handoff; this is a report only.
- If you want, I can draft concrete patches directly in the repo.
