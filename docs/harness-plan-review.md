# Harness Plan Review — Codebase-Verified Findings

**Date:** 2026-02-17  
**Reviewer:** Brian (Implementation Lead)  
**Document Under Review:** 03-Harness-Plan-Menu.ca-v2.docx (v0.2, 2026-02-17)  
**Method:** Direct inspection of the Menu.ca V3 Replit codebase

---

## Overall Assessment

The Harness Plan is solid, well-structured, and evidence-backed. The CUT A/B/C separation for filtering test noise is exactly right. Below are corrections where the audit's findings differ from what actually exists in the codebase, plus additions that would strengthen the plan.

---

## Corrections (Audit Got Wrong or Marked UNKNOWN)

### 1. Analytics Library Is GA4, Not Unknown

**Plan says (Sections 3, 5, Conflicts):** "App analytics library is UNKNOWN without Replit repo access."

**Actual:** The app uses **Google Analytics 4 (GA4)** via `gtag.js`. A full `AnalyticsProvider` component exists at `components/providers/analytics-provider.tsx`. It:
- Loads Google Tag Manager dynamically per restaurant measurement ID
- Tracks page views on route changes
- Supports per-restaurant GA4 properties

This means checkout funnel tracking *could* be added via GA4 events without introducing a new analytics tool. The `cart_sessions` table being empty is still accurate — GA4 is handling page-level analytics, not cart-level lifecycle events.

**Action:** Update Section 3 (Inputs) to change "App analytics library" status from UNKNOWN to "GA4 via gtag.js (page views only; no cart/checkout events)." Remove from Conflicts & Unknowns.

---

### 2. Stripe Webhook Signature Verification Is Correctly Implemented

**Plan says (Conflicts):** "Whether Stripe webhook signature verification is correctly implemented is UNKNOWN."

**Actual:** The webhook handler at `app/api/customer/stripe-webhook/route.ts` correctly implements signature verification:
- Reads `STRIPE_WEBHOOK_SECRET` from environment
- Rejects requests if secret is not configured (500 — fail closed)
- Rejects requests with no `stripe-signature` header (400)
- Calls `stripe.webhooks.constructEvent(body, signature, webhookSecret)` to verify
- Returns 400 on verification failure

This is the standard, correct Stripe implementation.

**Action:** Remove from Conflicts & Unknowns. Optionally note in Section 7 as "verified correct."

---

### 3. Feature Flags — Confirmed Missing

**Plan says:** "feature_flags table documented but missing; only per-restaurant ordering/delivery toggles exist."

**Actual:** Confirmed. Zero references to `feature_flag` or `kill_switch` anywhere in the codebase. The only toggles available are:
- `online_ordering_enabled` (per restaurant)
- `delivery_enabled` (per restaurant)  
- `payment_mode` (test/live, per restaurant)
- `twilio_call` (per restaurant, in `delivery_and_pickup_configs`)

**Action:** No correction needed. The plan is accurate here.

---

### 4. RLS Policy `anon_can_read_orders` — Cannot Confirm from Code

**Plan says (Section 7):** "orders table has anon_can_read_orders allowing anon SELECT true."

**Actual:** No reference to `anon_can_read_orders` exists in the application code. This is a database-level RLS policy that can only be verified directly in the Supabase dashboard (SQL editor or Auth policies UI). The concern is valid and should be investigated, but it can't be confirmed or denied from the codebase alone.

**Action:** Keep the finding but add a note: "Requires verification in Supabase dashboard — not referenced in application code."

---

## Additions (Missing from the Plan)

### 5. Tablet Health Telemetry — Missing from Inputs Table

The plan doesn't mention tablet device telemetry at all, but it's a live, available data source directly relevant to "detect device delivery failures before restaurant complains."

The `devices` table receives real-time heartbeat data including:

| Field | Description |
|:------|:------------|
| `last_check_at` | Last heartbeat timestamp |
| `battery_level` | Battery percentage |
| `printer_status` | Printer state (connected/unknown/error) |
| `app_version` | Tablet app version |
| `last_successful_fetch` | Last successful order fetch timestamp |
| `consecutive_fetch_failures` | Count of consecutive failed fetches |
| `oldest_pending_order_minutes` | Age of oldest unacknowledged order on device |

**Data flows:** Tablet app sends POST to `/api/tablet/heartbeat` every ~5 seconds. The admin dashboard at `/admin/devices` already displays this data with health status levels (healthy/warning/critical/offline).

**Action:** Add to Section 3 Inputs table:

| Source | Owner | What We Need | Status | Notes |
|:-------|:------|:-------------|:-------|:------|
| Supabase DB: devices (heartbeat telemetry) | Engineering | Device health: battery, printer, fetch failures, heartbeat age, app version | AVAILABLE | Real-time via tablet heartbeat; dashboard exists at /admin/devices |

Also consider adding a **Tablet Health** tile to the Restaurant Health Dashboard (Section 4.2) showing devices with critical status or offline > 2 minutes.

---

### 6. Twilio Fallback Tracking — Dual-Source, Plan Is Partially Correct

**Plan says (Section 5.2):** Twilio fallback events are tracked in `order_status_history`.

**Actual:** The plan is correct that `order_status_history` is used — it is the **primary** tracking source. The function `logFallbackCallAttempt()` writes rows to `order_status_history` with status `twilio_fallback_call` and marker text in the `notes` column. The system reads these rows back via `getFallbackCallStatus()` to count attempts and determine retry eligibility.

However, there is also a **legacy fallback path**: if no `order_status_history` rows are found for an order, the system falls back to parsing `[TWILIO_FALLBACK_CALL]` markers in `orders.special_instructions`. This handles orders that were tracked before the `order_status_history` migration.

The markers/statuses used are:

- **Primary (order_status_history):**
  - Status: `twilio_fallback_call`, notes contain `[TWILIO_FALLBACK_CALL] Call placed to ...` or `[TWILIO_FALLBACK_CALL] Call failed to ...`
  - Status: `twilio_fallback_confirmed` (when restaurant confirms via phone)

- **Legacy fallback (orders.special_instructions):**
  - `[TWILIO_FALLBACK_CALL] Call placed` / `Call failed`
  - `[TWILIO_FALLBACK_MAX_REACHED]` — auto-acknowledged after 3 attempts
  - `[TWILIO_FALLBACK_CONFIRMED]` — restaurant confirmed by phone

**Scorecard SQL should query `order_status_history` as primary:**

```sql
-- Count orders with fallback calls (primary source)
SELECT count(DISTINCT order_id)
FROM menuca_v3.order_status_history
WHERE status = 'twilio_fallback_call'
  AND created_at >= now() - interval '24 hours';

-- Count orders that hit max retries (check special_instructions for legacy + new)
SELECT count(*)
FROM menuca_v3.orders
WHERE special_instructions LIKE '%[TWILIO_FALLBACK_MAX_REACHED]%'
  AND created_at >= now() - interval '24 hours'
  AND is_test_order = false;
```

**Action:** Update Section 5.2 to note `order_status_history` as primary source (plan is correct) and `special_instructions` as legacy fallback. Add example queries to the SQL appendix.

---

### 7. Test Noise Filtering — Both Flags Are Needed Together

**Plan says:** Uses `is_test_order` and `payment_mode` filters for CUT A/B/C.

**Clarification:** These two flags serve different purposes and both are needed:

- **`is_test_order`** (on the `orders` table): The per-order truth. Set at order creation time. This is the reliable filter for individual order queries. Use this for scorecard metrics.
- **`payment_mode`** (on `delivery_and_pickup_configs`): The restaurant's *current* configuration. Can change over time (restaurant switches from test to live). Use this for "which restaurants are live right now" counts.

A restaurant could have `payment_mode = 'live'` today but still have old orders where `is_test_order = true` from when they were in test mode. The plan already handles this correctly with CUT A/B/C, but implementers should know that `is_test_order` on the order row is the canonical per-order filter, while `payment_mode` is the current-state restaurant filter.

**Action:** Add a brief note in Section 6 (Data Quality Gates) clarifying this distinction for query authors.

---

### 8. Backend Error Monitoring — Partially Available

**Plan says:** "Backend error rate/latency — UNKNOWN."

**Actual:**
- **Next.js server logs** are available through Replit's deployment log viewer (production) and workflow console (development). They are unstructured console output, not indexed or alerted on.
- **Sentry** is configured for the **React Native tablet app only** (project: `react-native`, release: `ca.menu.orders@X.X.X`). It captures tablet-side errors like heartbeat 500s.
- **No Sentry or structured error monitoring** exists for the web application (Next.js).

**Action:** Update Section 3 to change "Backend logs / error monitoring" status from UNKNOWN to "Partial — unstructured deployment logs available; no structured monitoring or alerting. Sentry exists for tablet app only."

---

### 9. Excluded Test Restaurant

For scorecard query authors: **JJ's Shawarma (restaurant ID 1021)** is the internal test restaurant. It is already excluded from commission reports and batch statements via an `EXCLUDED_RESTAURANT_IDS` constant. Scorecard queries should also exclude this restaurant ID, or rely on `is_test_order = true` filtering which should catch test orders from this restaurant.

**Action:** Document restaurant ID 1021 as the test restaurant in the SQL appendix alongside CUT filter definitions.

---

## Known Tablet App Issues (Client-Side, Not Dashboard)

Two issues visible on the device health dashboard are caused by the React Native tablet app, not the server:

1. **Version shows 1.4.0 instead of 1.4.22** — The tablet app hardcodes `app_version: "1.4.0"` in its heartbeat payload instead of reading from the app manifest. Fix is in React Native code.

2. **Last Fetch shows "Never"** — The tablet app sends `null` for `last_successful_fetch` in heartbeats. The server correctly stores whatever value it receives. Fix is in React Native code to populate this timestamp after each successful order fetch.

The server endpoint (`/api/tablet/heartbeat`) and dashboard (`/admin/devices`) handle both fields correctly — they display whatever the tablet sends.

---

## Summary of Required Actions

| # | Section | Action | Priority |
|:--|:--------|:-------|:---------|
| 1 | 3, 5, Conflicts | Update analytics from UNKNOWN to GA4 (page views only) | Medium |
| 2 | Conflicts | Remove Stripe webhook verification concern (verified correct) | Low |
| 3 | 3 (Inputs) | Add tablet device telemetry as available data source | High |
| 4 | 4.2 (Dashboards) | Add tablet health tile to Restaurant Health Dashboard | Medium |
| 5 | 5.2 | Clarify Twilio dual-source tracking: `order_status_history` (primary) + `special_instructions` (legacy fallback) | High |
| 6 | 6 | Clarify `is_test_order` vs `payment_mode` usage for query authors | Medium |
| 7 | 3 | Update backend monitoring status to "Partial" | Low |
| 8 | SQL Appendix | Add JJ's Shawarma (ID 1021) exclusion note | Low |
| 9 | 7 | Add note that RLS policy needs Supabase dashboard verification | Low |
