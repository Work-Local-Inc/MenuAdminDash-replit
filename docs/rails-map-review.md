# Execution Rails Map Review — Codebase-Verified Findings

**Date:** 2026-02-17  
**Reviewer:** Brian (Implementation Lead)  
**Document Under Review:** 04-Rails-Map_Menu.caV3.docx (v0.2, 2026-02-17)  
**Method:** Direct inspection of the Menu.ca V3 Replit codebase

---

## Overall Assessment

The Rails Map is a strong operational framework. The kill switch inventory, stuck-order containment procedures, and incident severity definitions are well-structured. Below are corrections where the document's claims differ from codebase reality, plus additions to strengthen the operational playbook.

---

## Corrections

### 1. Kill Switches — Invocation Paths Need Updating

**Rails Map says (Section 5.1):** Kill switches are invoked via RPCs like `toggle_online_ordering(restaurant_id, false)` and `deactivate_device(device_id)`.

**Actual:**

- **`toggle_online_ordering` RPC:** No such RPC function exists in the codebase. The `online_ordering_enabled` field is toggled through the admin dashboard UI at `/admin/restaurants/[id]` and the franchise management page. The actual update goes through the restaurant admin API, not a standalone RPC. For emergency SQL-level toggling, the direct SQL approach documented in the Rails Map is correct.

- **`deactivate_device` RPC:** No standalone RPC exists. Device deactivation is handled via the admin API at `app/api/admin/devices/[id]/route.ts` (PATCH endpoint that can update `is_active`). The admin dashboard at `/admin/devices` provides the UI for this.

- **`has_delivery_enabled`:** This field exists and is used across multiple files including checkout, order type selection, and delivery provider logic. The SQL approach documented is correct.

**Action:** Update the "How to invoke" column in Section 5.1:
- Replace `toggle_online_ordering(restaurant_id, false)` with "Admin dashboard UI at `/admin/restaurants/[id]` (uses API route `app/api/restaurants/toggle-online-ordering/route.ts`) OR direct SQL update"
- Replace `deactivate_device(device_id)` with "Admin dashboard UI at `/admin/devices` (PATCH API at `/api/admin/devices/[id]`) OR direct SQL update"

---

### 2. Menu Cache Functions — Do Not Exist in Codebase

**Rails Map says (Section 5.3):** "Available DB/RPC surface includes rebuild_menu_cache(), rebuild_all_menu_caches(), invalidate_menu_cache()."

**Actual:** None of these functions exist in the application codebase. Zero matches for `rebuild_menu_cache`, `invalidate_menu_cache`, or `rebuild_all_menu_caches`.

The menu system uses a single Supabase RPC function `get_restaurant_menu_cached` (called in `lib/supabase/menu.ts`). This is a database-level cached query — the caching mechanism is internal to the Supabase RPC, not controlled by app-level functions.

This means:
- There is **no "force resync" procedure** available today from the app layer
- Menu cache rebuild/invalidation would require either (a) modifying the Supabase RPC function to accept a cache-bust parameter, or (b) creating new RPC functions for cache management
- The "UNKNOWN: current automation/cron frequency for cache rebuild" is answered: **there is no automation** — the cache behavior is entirely within the DB function

**Action:** Update Section 5.3 to reflect that cache management functions do not exist yet and must be built. Remove the claim that they are "available." Add this as a near-term instrumentation priority.

---

### 3. Availability Check Functions — Do Not Exist

**Rails Map says (Section 4.4):** "Availability checks must align: is_restaurant_open_now() / can_accept_orders() should match hours and ordering toggles."

**Actual:** Neither `is_restaurant_open_now()` nor `can_accept_orders()` exist as named functions in the codebase. Restaurant availability is determined by a combination of:
- `online_ordering_enabled` flag on the restaurant
- `has_delivery_enabled` on `delivery_and_pickup_configs`
- Business hours logic embedded in the customer-facing restaurant pages

These checks are inline in components, not centralized into reusable functions. The recommendation to align them is valid — it just can't reference existing functions that don't exist.

**Action:** Reframe Section 4.4 to say "availability logic is currently inline and not centralized" rather than referencing specific function names. Add "centralize availability checking into reusable functions" as an improvement item.

---

### 4. Error Observability — Partially Known, Not Fully UNKNOWN

**Rails Map says (Section 4.5):** "UNKNOWN: what error logging tool is currently in use."

**Actual:**
- **Sentry** is configured for the **React Native tablet app** (project: `react-native`, release: `ca.menu.orders@X.X.X`). It captures tablet-side errors including heartbeat failures.
- **No Sentry or structured error monitoring** exists for the Next.js web application.
- **Deployment logs** are available through Replit's deployment log viewer (unstructured console output, not indexed or alerted on).
- **Console logging** is used extensively throughout the codebase (e.g., `[Device Heartbeat]`, `[OrderFallback]`, `[Stripe Webhook]` prefixed logs) — these are structured by convention but not by tooling.

**Action:** Update Section 4.5 from "UNKNOWN" to "Partial: Sentry for tablet app only; unstructured console logs for web app via Replit deployment viewer; no centralized error monitoring or alerting for the web application."

---

### 5. Analytics — Resolved, Not Unknown

**Rails Map says (Sections 4.3, 2):** "App-layer analytics libraries and events were not accessible in audits."

**Actual:** The app uses **Google Analytics 4 (GA4)** via `gtag.js`. A full `AnalyticsProvider` exists at `components/providers/analytics-provider.tsx` with:
- Dynamic loading per restaurant measurement ID
- Page view tracking on route changes
- Per-restaurant GA4 property support

However, no checkout/funnel events are emitted — only page views. The `cart_sessions` table being empty is still accurate.

**Action:** Update Sections 4.3 and 2 to note GA4 is active for page views but no checkout events are emitted. The funnel tracking gap is confirmed but the "analytics unknown" status is resolved.

---

### 6. Stripe Webhook — V3 Attribution Is Possible

**Rails Map says (Section 4.2):** "We must filter/route webhook processing so V3 dashboards/alerts only consider V3-relevant intents."

**Actual:** This is already partially solved. The webhook handler at `app/api/customer/stripe-webhook/route.ts` matches events to V3 orders via `stripe_payment_intent_id`. The `payment_transactions` table stores per-transaction status including failures.

However, there's a gap: `payment_intent.payment_failed` events update `payment_transactions.status = 'failed'` but do **NOT** update `orders.payment_status`. This means V3 payment failure rate must be queried from `payment_transactions`, not `orders`.

**Recommended code fix:** Add `orders.payment_status = 'failed'` update to the `payment_intent.payment_failed` webhook handler, making the orders table a single source of truth.

**Action:** Update Section 4.2 to note that V3 attribution is already possible via `stripe_payment_intent_id` join. Add the webhook gap (failures not written to orders) as a known limitation with recommended fix.

---

## Additions

### 7. Tablet Health & Recovery — Missing from Action Rails

The Rails Map's kill switches (Section 5.1) include device deactivation, but don't mention the existing **remote recovery system** which is a key operational tool.

**Available now:**

| Action | How | Endpoint |
|:-------|:----|:---------|
| Send Resync command | Admin dashboard at `/admin/devices` or API | `POST /api/admin/devices/[id]/recovery` with `action: 'resync'` |
| Force App Reload | Admin dashboard at `/admin/devices` or API | `POST /api/admin/devices/[id]/recovery` with `action: 'reload_app'` |
| View command history | Admin dashboard | `GET /api/admin/devices/[id]/recovery` |
| Tablet acknowledges command | Automatic via heartbeat | `POST /api/tablet/recovery-ack` |

Commands are delivered via the heartbeat response with a 2-minute TTL. If not acknowledged, they expire automatically.

**This is directly relevant to stuck-order containment (Section 5.2):** When `paid_no_ack` spikes for a restaurant, before pausing ordering, ops can first try sending a resync or reload command to the tablet. This is less disruptive than killing ordering entirely.

**Action:** Add tablet recovery commands to Section 5.1 (Kill Switches / Containment) or create a new Section 5.4 for device recovery procedures. Update the stuck-order containment rail (Section 5.2) to include "attempt tablet resync before pausing ordering" as an intermediate step.

---

### 8. Twilio Fallback — Missing from Containment Rail

The stuck-order containment procedure (Section 5.2) mentions "confirm device connectivity and Twilio fallback" but doesn't detail what Twilio fallback data is available or how to check it.

**Available now:**

- **Twilio call status** is tracked in `order_status_history` (primary, status: `twilio_fallback_call`) and `orders.special_instructions` (legacy markers)
- **Per-restaurant Twilio toggle** exists at `delivery_and_pickup_configs.twilio_call` (boolean)
- **Max 3 calls per order** — after 3 attempts (placed + failed), the order is auto-acknowledged with `[TWILIO_FALLBACK_MAX_REACHED]` marker
- **Fallback call history** can be viewed via the admin dashboard's order details

**Containment checklist addition for paid_no_ack:**
1. Check if `twilio_call = true` for the restaurant's config
2. Check `order_status_history` for `twilio_fallback_call` entries on the stuck order
3. If no calls attempted: check restaurant phone numbers in `restaurant_contacts` and `restaurant_locations`
4. If max reached with no confirmation: restaurant may be unreachable — escalate and pause ordering

**Action:** Add Twilio fallback details to Section 5.2 containment procedure. Include the per-restaurant toggle and max-retry behavior.

---

### 9. Rollback Mechanisms — Replit Provides Code Rollback

**Rails Map says (Section 6.2):** "UNKNOWN: one-click code rollback mechanism."

**Actual:** Replit provides automatic checkpoints and a rollback UI. Code can be rolled back to any previous checkpoint through the Replit interface. This isn't a CI/CD pipeline rollback but it is functional for reverting code changes.

However, database rollback remains weak as the Rails Map correctly notes — there are no down-migrations or versioned migration tooling.

**Action:** Update Section 6.2 to note that code rollback is available via Replit checkpoints. Keep the database rollback concern as-is.

---

### 10. Test Restaurant Exclusion

For all operational queries and dashboards referenced in the Rails Map: **JJ's Shawarma (restaurant ID 1021)** is the internal test restaurant. It should be excluded from stuck-order counts, completion rates, and all production metrics. It's already excluded from commission/accounting reports via an `EXCLUDED_RESTAURANT_IDS` constant.

**Action:** Document restaurant ID 1021 as the test restaurant in Section 4.1 or in the SQL appendix alongside CUT filter definitions.

---

## Rails Accuracy Summary

| Rail | Document Status | Codebase-Verified Status | Notes |
|:-----|:---------------|:------------------------|:------|
| Kill Switches (5.1) | Available Now | **Partially Correct** | Switches exist but invocation paths (RPCs) are wrong — use admin UI or direct SQL |
| Stuck-Order Containment (5.2) | Defined | **Correct, Incomplete** | Missing tablet recovery and Twilio fallback details as intermediate steps |
| Menu Cache Repair (5.3) | Available | **Functions Don't Exist** | `rebuild_menu_cache` etc. not in codebase; cache is DB-side RPC only |
| Order Lifecycle Rail (4.1) | Measurable | **Confirmed** | All fields present in orders table |
| Payment Integrity (4.2) | Proxy | **Improvable** | V3 attribution possible via `payment_transactions` join; webhook gap on failures |
| Checkout Funnel (4.3) | Blocked | **Confirmed Blocked** | GA4 active (page views) but no checkout events; `cart_sessions` empty |
| Menu & Availability (4.4) | Defined | **Functions Don't Exist** | `is_restaurant_open_now` / `can_accept_orders` not in codebase; logic is inline |
| Error Observability (4.5) | Unknown | **Partial** | Sentry for tablet only; unstructured logs for web app |
| Support Signal (4.6) | Blocked | **Confirmed Blocked** | No ticketing integration |
| Release Rails (6) | Defined | **Code Rollback Available** | Replit checkpoints provide code rollback; DB rollback still weak |
| Tablet Recovery | Not Mentioned | **Available Now** | Resync + reload commands via admin dashboard and API |
| Twilio Fallback Details | Mentioned Briefly | **Available Now** | Full tracking in `order_status_history` + per-restaurant toggle + max 3 calls |

---

## Conflicts & Unknowns — Updated Status

| Original Unknown | Updated Status |
|:-----------------|:---------------|
| RPC invocation paths for kill switches | **Corrected** — No standalone RPCs; use admin UI or direct SQL |
| Menu cache rebuild functions | **Corrected** — Functions don't exist; must be built |
| Availability check functions | **Corrected** — Functions don't exist; logic is inline |
| Error logging tool | **Partially resolved** — Sentry for tablet app; unstructured console logs for web app |
| App analytics | **Resolved** — GA4 via gtag.js (page views only) |
| Code rollback mechanism | **Resolved** — Replit checkpoints available |
| Database rollback | **Confirmed weak** — No down-migrations or versioned schema management |
| Environment separation | **Confirmed** — Single DB, single deployment; test/live via per-restaurant `payment_mode` and per-order `is_test_order` |
