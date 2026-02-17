# Scorecard Review — Codebase-Verified Findings

**Date:** 2026-02-17  
**Reviewer:** Brian (Implementation Lead)  
**Document Under Review:** 02-Scorecard-Menu.ca-v2.docx (v0.2, 2026-02-17)  
**Method:** Direct inspection of the Menu.ca V3 Replit codebase

---

## Overall Assessment

The scorecard is well-constructed. The CUT A/B/C framework is the right approach, the metric definitions are clear, and the evidence anchoring is thorough. Most of the "measurable now" claims are accurate. Below are corrections, clarifications, and additions based on what's actually in the codebase.

---

## Corrections

### 1. Payment Failure Rate — Better Than Raw Webhook Proxy, But Has a Gap

**Scorecard says:** "PROXY ONLY: webhook stream likely includes non-V3 orders (55:1 mismatch)."

**Actual:** The V3 webhook handler at `app/api/customer/stripe-webhook/route.ts` handles both `payment_intent.succeeded` and `payment_intent.payment_failed` events. However, there's an important asymmetry:

- **On success:** The handler updates both `payment_transactions.status = 'succeeded'` AND `orders.payment_status = 'paid'`
- **On failure:** The handler updates only `payment_transactions.status = 'failed'` — it does **NOT** update `orders.payment_status`

This means you **cannot** measure payment failures from the `orders` table alone. The `orders.payment_status` column will never contain `'failed'` because the webhook doesn't write that value.

**The correct V3-specific query uses the `payment_transactions` table:**

```sql
-- V3-only payment failure rate (via payment_transactions)
SELECT
  count(*) FILTER (WHERE pt.status = 'failed') as failed,
  count(*) FILTER (WHERE pt.status IN ('succeeded', 'failed')) as total,
  ROUND(100.0 * count(*) FILTER (WHERE pt.status = 'failed') /
    NULLIF(count(*) FILTER (WHERE pt.status IN ('succeeded', 'failed')), 0), 1) as failure_rate_pct
FROM menuca_v3.payment_transactions pt
JOIN menuca_v3.orders o ON o.stripe_payment_intent_id = pt.stripe_payment_intent_id
WHERE o.is_test_order = false
  AND pt.created_at >= now() - interval '7 days';
```

This is significantly more accurate than the raw `stripe_webhook_events` proxy because it joins through to V3 orders only.

**Recommended code fix:** Update the webhook handler to also set `orders.payment_status = 'failed'` on `payment_intent.payment_failed` events. This would make the `orders` table a single source of truth for both success and failure, simplifying all scorecard queries.

**Action:** Update Payment Failure Rate status from "PROXY ONLY" to "MEASURABLE via `payment_transactions` table (V3-specific); raw `stripe_webhook_events` remains noisy." Add the query above to the SQL appendix. Consider the webhook code fix as a near-term improvement.

---

### 2. Checkout Funnel — Analytics Library Is Known (GA4)

**Scorecard says (Section 4, Conflicts):** "app analytics unknown" / "frontend analytics unknown."

**Actual:** The app uses **Google Analytics 4 (GA4)** via `gtag.js`. A full `AnalyticsProvider` exists at `components/providers/analytics-provider.tsx` with per-restaurant measurement IDs and page view tracking. However, it only tracks page views — no checkout funnel events are emitted (no `checkout_started`, `payment_attempted`, etc.).

The `cart_sessions` table being empty is still accurate. Checkout funnel tracking remains blocked, but the path forward is clearer: either add GA4 custom events for checkout steps, or populate `cart_sessions` from the server side.

**Action:** Update "Telemetry Coverage: Checkout Funnel" source from "app analytics unknown" to "GA4 active (page views only); no checkout events emitted; cart_sessions empty." Remove "frontend analytics unknown" from Conflicts & Unknowns.

---

### 3. Menu Cache — The Codebase Has a Cache Function, Not a Cache Table

**Scorecard says (Section 5):** "Menu Cache Freshness — Age of menu cache (if cache is used). Healthy: < 24h."

**Actual:** The menu system uses a Supabase RPC function `get_restaurant_menu_cached` (called in `lib/supabase/menu.ts`). This is a **database-level cache** (likely a materialized view or cached query result managed by Supabase), not an application-level cache table that the app writes to. The app doesn't have a `menu_cache` table it can query for freshness — the caching is internal to the database function.

This means measuring "cache freshness" requires either:
- Querying the database function's internal cache metadata (if it exposes a timestamp), or
- Adding a `cache_rebuilt_at` timestamp column/table that the RPC function updates when it refreshes

**Action:** Add a note to Section 5 that menu cache freshness monitoring requires database-side instrumentation (the app doesn't control the cache directly). Clarify whether `get_restaurant_menu_cached` exposes a last-refresh timestamp.

---

### 4. Stripe Webhook Signature Verification — Confirmed Correct

**Scorecard references (via evidence docs):** "Whether Stripe webhook signature verification is correctly implemented is UNKNOWN."

**Actual:** Already verified in the harness plan review. The webhook handler correctly uses `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`. Requests without valid signatures are rejected. This is not a risk item.

**Action:** If this concern appears in linked evidence docs, note it as resolved.

---

## Additions

### 5. Twilio Fallback Metrics — Querying Guidance for Scorecard Authors

The scorecard references "Twilio fallback max reached" as a metric but doesn't specify where to query it.

**Current tracking (dual-source):**

- **Primary:** `order_status_history` table with status `twilio_fallback_call` (rows written by `logFallbackCallAttempt()`)
- **Legacy fallback:** `orders.special_instructions` field with `[TWILIO_FALLBACK_CALL]` and `[TWILIO_FALLBACK_MAX_REACHED]` markers

**Recommended scorecard queries:**

```sql
-- Twilio fallback calls in last 24h (primary source)
SELECT count(DISTINCT order_id) as orders_with_fallback_calls
FROM menuca_v3.order_status_history
WHERE status = 'twilio_fallback_call'
  AND created_at >= now() - interval '24 hours';

-- Twilio max retries reached (special_instructions marker)
SELECT count(*) as max_reached_orders
FROM menuca_v3.orders
WHERE special_instructions LIKE '%[TWILIO_FALLBACK_MAX_REACHED]%'
  AND created_at >= now() - interval '24 hours'
  AND is_test_order = false;
```

**Action:** Add these queries to the SQL appendix. Note the dual-source tracking in the metric definition.

---

### 6. Tablet Health — Missing from Per-Restaurant Health Card

The scorecard's Per-Restaurant Health Card (Section 5) doesn't include tablet/device health, but this data is already available and directly relevant to order completion.

**Available now from the `devices` table:**

| Field | Healthy | Warn | Critical |
|:------|:--------|:-----|:---------|
| Heartbeat age (`last_check_at`) | < 2 min | > 2 min | > 5 min |
| Consecutive fetch failures | 0 | >= 1 | >= 3 |
| Battery level | > 20% | 10-20% | < 10% |
| Oldest pending order (minutes) | < 5 min | > 5 min | > 15 min |

The admin dashboard at `/admin/devices` already implements these thresholds. A restaurant with a tablet that hasn't sent a heartbeat in 5+ minutes is at high risk of missing orders — this is a leading indicator that appears *before* stuck orders show up.

**Action:** Add a "Tablet Health" row to the Per-Restaurant Health Card in Section 5.

---

### 7. Order Lifecycle — `acknowledged_at` Is the Key Stuck-Order Signal

The scorecard correctly identifies stuck orders as a top metric, but doesn't call out `acknowledged_at` as the primary field that distinguishes "stuck" stages.

**How the order lifecycle works in code:**

1. Order created → `order_status = 'pending'`, `payment_status = 'paid'`, `acknowledged_at = NULL`
2. Tablet acknowledges → `acknowledged_at` is set
3. Tablet completes → `completed_at` is set, `order_status` updated

The stuck taxonomy from the forensics doc maps to:
- **paid_no_ack:** `payment_status = 'paid'` AND `acknowledged_at IS NULL` AND age > threshold
- **acked_not_completed:** `acknowledged_at IS NOT NULL` AND `completed_at IS NULL` AND age > threshold
- **completed_at_inconsistent:** `completed_at IS NOT NULL` AND `order_status` not terminal

This is consistent with what the scorecard defines. Just noting it here so query authors know the exact column names.

---

### 8. Test Restaurant Exclusion

For all scorecard queries: **JJ's Shawarma (restaurant ID 1021)** is the internal test restaurant. It should be excluded from CUT C reporting alongside the `is_test_order` and `payment_mode` filters. It's already excluded from commission/accounting reports via an `EXCLUDED_RESTAURANT_IDS` constant.

**Action:** Document restaurant ID 1021 in the CUT filter definitions or SQL appendix.

---

### 9. Environment Separation — Current State

**Scorecard says (Conflicts):** "Environment separation is incomplete/UNKNOWN."

**Actual state:**
- **Database:** Single Supabase instance with `menuca_v3` schema. No separate staging DB. Test vs live is controlled per-restaurant via `payment_mode` and per-order via `is_test_order`.
- **Stripe:** Two sets of keys exist — `TESTING_STRIPE_SECRET_KEY` / `TESTING_VITE_STRIPE_PUBLIC_KEY` for test mode, and `STRIPE_SECRET_KEY` / `VITE_STRIPE_PUBLIC_KEY` for live mode. The webhook handler currently uses `TESTING_STRIPE_SECRET_KEY` as primary (falls back to `STRIPE_SECRET_KEY`).
- **Deployment:** Single Replit deployment. No staging environment. Dev server runs locally via `npm run dev`.

The CUT A/B/C framework is the correct mitigation for this. True environment separation would be ideal but isn't blocking scorecard measurement as long as CUT filters are applied consistently.

**Action:** Update the Conflicts section to reflect this as "known and mitigated by CUT filters" rather than "UNKNOWN."

---

## Scorecard Metric Accuracy Summary

| Metric | Scorecard Status | Codebase-Verified Status | Notes |
|:-------|:----------------|:------------------------|:------|
| Order Completion Rate | Measurable Now | **Confirmed** | Orders table has all required fields |
| Stuck Paid Orders | Measurable Now | **Confirmed** | `acknowledged_at`, `completed_at`, `payment_status` all present |
| Refund Rate | Measurable Now | **Confirmed** | `order_refunds` table exists per migration scripts |
| Payment Failure Rate | Proxy Only | **Upgrade to Measurable (via `payment_transactions`)** | Cannot use `orders.payment_status` (failures not written there); use `payment_transactions.status` joined to orders. Webhook code fix recommended. |
| Checkout Funnel | Blocked | **Confirmed Blocked** | GA4 exists but no checkout events; `cart_sessions` empty |
| TTD | Blocked | **Confirmed Blocked** | No incident tracking system |
| TTR | Blocked | **Confirmed Blocked** | No incident tracking system |
| Support Load | Blocked | **Confirmed Blocked** | No ticketing integration |
| Menu Cache Freshness | Measurable Now | **Needs Clarification** | No app-level cache table visible; cache appears DB-side via RPC. Freshness monitoring requires DB-side instrumentation. |
| Twilio Fallback | Measurable Now | **Confirmed** | Dual-source: `order_status_history` (primary) + `special_instructions` (legacy) |
| Tablet Health | Not Mentioned | **Available Now** | `devices` table with real-time heartbeat data |

---

## Conflicts & Unknowns — Updated Status

| Original Unknown | Updated Status |
|:-----------------|:---------------|
| Stripe webhook includes non-V3 charges (55:1 mismatch) | **Partially resolved** — V3 payment failures can be measured directly via `orders.payment_status`. Webhook table remains noisy for account-wide metrics. |
| Checkout funnel telemetry missing | **Confirmed** — GA4 is active (page views) but no checkout events. `cart_sessions` empty. |
| Incident TTD/TTR blocked | **Confirmed** — No incident tracking system exists. |
| Environment separation incomplete | **Clarified** — Single DB, single deployment. Test/live separated per-restaurant via `payment_mode` and per-order via `is_test_order`. CUT A/B/C is the mitigation. |
| Frontend analytics unknown | **Resolved** — GA4 via gtag.js with per-restaurant measurement IDs. |
