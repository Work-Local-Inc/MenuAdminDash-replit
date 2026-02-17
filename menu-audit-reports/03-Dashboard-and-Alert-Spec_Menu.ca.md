# Menu.ca — Dashboard & Alert Specification
**Generated:** February 2026  
**Source:** Codebase analysis + operational requirements

---

## Section E — Observability

### E1) Golden Signals

#### 1. Order Success Rate

| Metric | Definition | Data Source | Query |
|---|---|---|---|
| **Order completion rate** | `COUNT(completed or delivered) / COUNT(all orders)` over time window | `orders` table | `SELECT COUNT(*) FILTER (WHERE order_status IN ('completed','delivered')) * 100.0 / COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '1 hour'` |
| **Payment success rate** | `COUNT(payment_status='paid') / COUNT(payment_status IN ('paid','failed'))` | `orders` table | Similar filter on `payment_status` |
| **Webhook error rate** | `COUNT(processed=false) / COUNT(*)` in recent webhook events | `stripe_webhook_events` | `SELECT COUNT(*) FILTER (WHERE NOT processed) FROM stripe_webhook_events WHERE created_at > NOW() - INTERVAL '1 hour'` |

#### 2. Order Volume Anomaly

| Metric | Definition | Data Source |
|---|---|---|
| **Hourly order volume** | `COUNT(orders)` per hour, compared to same hour last week | `orders` table |
| **Per-restaurant anomaly** | Orders in last hour vs. average for that restaurant/hour/day-of-week | `orders` table |

**Alert threshold:** < 50% of expected volume during business hours for a restaurant that normally gets orders.

#### 3. API Error Rate

| Metric | Definition | Data Source |
|---|---|---|
| **5xx rate** | Server errors on critical paths | Application logs / monitoring |
| **4xx rate** | Client errors that may indicate broken flows | Application logs |

**Note:** Currently no centralized error rate monitoring exists. Recommend adding middleware-level request logging or connecting to an APM tool.

#### 4. Stuck Orders

| Metric | Definition | Data Source |
|---|---|---|
| **Stuck paid orders** | Orders with `payment_status='paid'` AND `acknowledged_at IS NULL` AND `created_at > NOW() - INTERVAL '30 min'` | `orders` table |
| **Stuck preparing orders** | Orders in `preparing` for > 45 minutes | `orders` + `order_status_history` |

---

### E2) Restaurant Health Card

**Per-restaurant dashboard card fields:**

| Field | Computation | Threshold (Warning) | Threshold (Critical) |
|---|---|---|---|
| **Orders (15 min)** | `COUNT(orders) WHERE restaurant_id=X AND created_at > NOW()-15min` | < 1 during peak hours | 0 for 30+ min during peak |
| **Orders (1 hr)** | Same, 1-hour window | < expected avg | < 25% of expected |
| **Orders (24 hr)** | Same, 24-hour window | < expected avg | < 25% of expected |
| **Avg Order Value** | `AVG(total_amount) WHERE restaurant_id=X AND created_at > NOW()-24hr` | < $15 (unusually low) | < $8 |
| **Failed Payments** | `COUNT(payment_status='failed') WHERE restaurant_id=X AND created_at > NOW()-1hr` | > 2 | > 5 |
| **Stuck Orders** | `COUNT(*) WHERE payment_status='paid' AND acknowledged_at IS NULL AND age > 5min` | > 0 | > 2 |
| **Refund Rate** | `SUM(refund_amount) / SUM(total_amount)` over 24 hrs | > 5% | > 15% |
| **Tablet Status** | Device health from `devices.last_check_at` | Warning > 2 min stale | Critical > 5 min stale |
| **Tablet Health** | From health telemetry fields on `devices` table | `consecutive_fetch_failures >= 3` | Offline > 2 min |
| **Last Fallback Call** | Most recent `[TWILIO_FALLBACK_CALL]` marker | Any in last 1 hr | Multiple in last 1 hr |

---

### E3) Alert Design

| Alert | Severity | Trigger | Time Window | Suppression | Owner | First Action |
|---|---|---|---|---|---|---|
| **Order success rate drop** | P1 | Completion rate < 80% | 30 min rolling | Suppress if < 5 total orders in window | Brian | Check payment webhook + tablet connectivity |
| **Payment failure spike** | P1 | > 3 failed payments in 15 min (any restaurant) | 15 min rolling | None | Brian | Check Stripe dashboard + webhook logs |
| **5xx spike on checkout/payment** | P1 | > 5 server errors on `/api/customer/create-payment-intent` or `/api/customer/orders` | 10 min | Suppress during deploys | Brian | Check application logs, recent deploy |
| **Zero orders anomaly** | P2 | Restaurant with 0 orders during expected busy hours (based on historical pattern) | 1 hr | Suppress if restaurant is not `is_online_ordering_active` | Brian | Verify restaurant menu loads, check if ordering is disabled |
| **Stuck paid orders** | P2 | Any order `payment_status='paid'` AND `acknowledged_at IS NULL` for > 5 min | Continuous | Existing Twilio fallback handles this | Brian/Auto | Twilio fallback system auto-calls; alert if fallback also fails |
| **Tablet offline** | P2 | `devices.last_check_at` > 5 min stale during business hours | Continuous | Suppress outside restaurant hours | Brian | Check tablet health dashboard at `/admin/devices`; send recovery command |
| **Webhook processing backlog** | P2 | > 10 unprocessed events in `stripe_webhook_events` | 15 min | None | Brian | Check webhook endpoint health, verify Stripe dashboard |
| **Fallback call max reached** | P3 | `[TWILIO_FALLBACK_MAX_REACHED]` marker written | Per-order | Deduplicate per order | Brian | Contact restaurant directly; investigate tablet issue |
| **High refund rate** | P3 | Refund rate > 10% for a restaurant in 24 hrs | 24 hr rolling | None | Brian | Review refund reasons, contact restaurant |
| **Menu sync stale** | P3 | No menu cache refresh in > 24 hrs for active restaurant | 24 hr | Suppress for inactive restaurants | Brian | Trigger menu cache refresh |

---

### E4) Current Monitoring Infrastructure

**What Exists Today:**

| Component | Status | Location |
|---|---|---|
| Tablet Health Dashboard | LIVE | `/admin/devices` — real-time health cards with auto-refresh |
| Twilio Fallback System | LIVE | Cron at `/api/cron/order-fallback` — auto-calls for unacked orders |
| Fallback Call History | LIVE | `/api/fallback-calls` — reads from both `special_instructions` and `order_status_history` |
| GA4 Client-side Events | PARTIALLY LIVE | `lib/analytics.ts` — needs verification that GA4 measurement ID is configured |
| Sentry Error Tracking | LIVE (tablet only) | React Native app `ca.menu.orders` reports to Sentry |
| Stripe Dashboard | EXTERNAL | Stripe.com dashboard for payment monitoring |

**What Does NOT Exist:**

| Component | Priority | Recommendation |
|---|---|---|
| Server-side error tracking (Next.js) | HIGH | Add Sentry for Next.js |
| Request-level APM/tracing | HIGH | Add Vercel Analytics or custom request logging |
| Centralized alert system | HIGH | Add PagerDuty/Opsgenie or Slack webhook alerts |
| Order success rate dashboard | HIGH | Build Supabase SQL dashboard or Metabase |
| Per-restaurant health dashboard | MEDIUM | Extend admin dashboard with health cards |
| Automated anomaly detection | LOW | Phase 2 — ML-based anomaly detection |

---

### Proposed Dashboard Architecture

```
┌─────────────────────────────────────┐
│  Menu.ca Operations Dashboard       │
├──────────┬──────────┬───────────────┤
│ Platform │ Tablets  │ Restaurants   │
│ Health   │ Health   │ Health Cards  │
├──────────┼──────────┼───────────────┤
│ Order    │ Device   │ Per-restaurant│
│ success  │ status   │ order volume  │
│ rate     │ grid     │ + stuck count │
│          │          │               │
│ Payment  │ Recovery │ Refund rate   │
│ failure  │ commands │               │
│ count    │          │ Conversion    │
│          │ Health   │ funnel        │
│ Webhook  │ telemetry│               │
│ backlog  │          │ Last fallback │
│          │          │ call          │
└──────────┴──────────┴───────────────┘
```

### Implementation Priority

1. **Week 1:** Add Sentry to Next.js, create Slack webhook for P1 alerts
2. **Week 2:** Build order success rate + payment failure queries (can run against Supabase directly)
3. **Week 3:** Per-restaurant health cards in admin dashboard
4. **Week 4:** Automated alerting via cron or Supabase Edge Functions
