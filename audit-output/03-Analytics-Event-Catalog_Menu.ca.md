# Menu.ca — Analytics Event Catalog
**Generated:** February 2026  
**Source:** `lib/analytics.ts`, `lib/analytics/`

---

## Analytics Implementation

### Library Used
- **Google Analytics 4 (GA4)** via `window.gtag` (client-side only)
- No Segment, PostHog, Mixpanel, or other analytics platforms detected
- No server-side analytics events

### GA4 Event Catalog

| Event Name | Where Fired (file:function) | Required Props | Optional Props | Destination | Used in Dashboards? | Reliability Notes |
|---|---|---|---|---|---|---|
| `page_view` | `lib/analytics.ts:trackPageView()` | `page_path` | `page_title` | GA4 | Unknown | Client-side only; requires gtag loaded |
| `view_item` | `lib/analytics.ts:trackViewItem()` | `currency` ("CAD"), `value`, `items[].item_id`, `items[].item_name` | `items[].item_category`, `items[].price`, `items[].quantity` | GA4 | Unknown | Fired when customer views a dish |
| `add_to_cart` | `lib/analytics.ts:trackAddToCart()` | `currency` ("CAD"), `value`, `items[].item_id`, `items[].item_name` | `items[].item_category`, `items[].price`, `items[].quantity` | GA4 | Unknown | Fired when item added to cart |
| `remove_from_cart` | `lib/analytics.ts:trackRemoveFromCart()` | `currency` ("CAD"), `value`, `items[].item_id`, `items[].item_name` | `items[].price`, `items[].quantity` | GA4 | Unknown | Fired when item removed from cart |
| `begin_checkout` | `lib/analytics.ts:trackBeginCheckout()` | `currency` ("CAD"), `value`, `items[]` array | None | GA4 | Unknown | Fired when checkout starts |
| `add_payment_info` | `lib/analytics.ts:trackAddPaymentInfo()` | `currency` ("CAD"), `value`, `payment_type` | None | GA4 | Unknown | Fired when payment method selected |
| `purchase` | `lib/analytics.ts:trackPurchase()` | `currency` ("CAD"), `transaction_id`, `value`, `items[]` array | `tax`, `shipping` | GA4 | Unknown | Fired after successful payment |

### Event Lifecycle (E-commerce Funnel)

```
page_view → view_item → add_to_cart → begin_checkout → add_payment_info → purchase
                              ↑
                     remove_from_cart
```

### Implementation Details

**Initialization (`lib/analytics.ts`):**
- `isGtagReady` flag controls whether events fire
- `isAnalyticsDisabled` flag can suppress all events
- `pendingEvents` array queues events before gtag is ready
- `setGtagReady(true)` flushes pending events
- `setAnalyticsDisabled()` clears queue and blocks events

**Event Dispatch (`sendEvent`):**
```typescript
function sendEvent(name: GA4EventName, params: GA4EventParams) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, params)
  }
}
```

### Missing Access / Gaps

| Gap | Impact | How to Fix |
|---|---|---|
| **No GA4 Measurement ID found in codebase** | VERIFIED: No gtag script tag or `G-XXXXXXX` ID found in `app/layout.tsx` or any layout file. GA4 tracking functions exist in `lib/analytics.ts` but **gtag is never loaded**. Analytics are effectively non-functional. | Add GA4 script to `app/layout.tsx` with proper measurement ID, or integrate via `@next/third-parties/google` |
| **No server-side analytics** | Payment failures, webhook errors, cron events not tracked | Add server-side event logging to Supabase or an observability tool |
| **No dashboard confirmation** | Unknown if GA4 dashboards exist or are monitored | Check Google Analytics property for Menu.ca |
| **No error tracking integration** | Only Sentry on React Native tablet app; web app has no error tracking | Add Sentry or similar to Next.js app |
| **No per-restaurant funnel tracking** | Cannot measure conversion rates per restaurant | Add `restaurant_id` / `restaurant_slug` as custom dimension in GA4 events |
| **`trackEvent` silently drops if gtag not ready** | Events before gtag initialization are queued but could be lost on page navigation | Verify `setGtagReady()` is called after gtag loads |
| **No admin-side analytics** | Admin actions (refunds, config changes, menu edits) not tracked | Add audit log events for admin operations |

### Restaurant-Level Analytics Endpoint

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/customer/restaurants/[slug]/analytics` | Track page view for specific restaurant |

This appears to be a custom server-side endpoint, but its implementation needs verification for what it actually logs and where.

### Recommendation: Priority Analytics Improvements

1. **Verify GA4 is live** — Check for measurement ID in page head
2. **Add `restaurant_id` to all events** — Enable per-restaurant funnel analysis
3. **Add server-side event logging** — Critical events: order created, payment failed, refund issued, webhook error
4. **Add error tracking** — Sentry for Next.js web app (already exists for React Native tablet app)
5. **Create GA4 Explorations** — E-commerce funnel, per-restaurant conversion, payment method breakdown
