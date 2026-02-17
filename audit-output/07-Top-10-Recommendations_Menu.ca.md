# Menu.ca — Top 10 Highest-Leverage Recommendations
**Generated:** February 2026  
**Source:** Comprehensive system audit

---

## Prioritized Improvements

### 1. Add Server-Side Error Tracking (Sentry for Next.js)

| Attribute | Detail |
|---|---|
| **What to change** | Install `@sentry/nextjs` and configure for the web application |
| **File/Area** | `next.config.mjs`, `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` |
| **Impact on reliability** | HIGH — Currently no visibility into server-side errors. Sentry on tablet (React Native) has already caught critical bugs. |
| **Effort** | LOW — 2-4 hours for basic setup |
| **Time-to-value** | Immediate — errors visible as soon as deployed |
| **Risk** | NONE — purely additive |
| **Validation** | Trigger a known error → verify it appears in Sentry dashboard |

---

### 2. Remove or Gate Debug/Test Endpoints

| Attribute | Detail |
|---|---|
| **What to change** | Remove or add admin auth to: `/api/test-connection`, `/api/test-restaurant`, `/api/test-auth`, `/api/check-public-tables`, `/api/tablet/test-bcrypt`, `/api/admin/db-inspector` |
| **File/Area** | `app/api/test-connection/route.ts`, `app/api/test-restaurant/route.ts`, `app/api/test-auth/route.ts`, `app/api/check-public-tables/route.ts`, `app/api/tablet/test-bcrypt/route.ts` |
| **Impact on reliability** | HIGH — these expose internal system info to the public internet |
| **Effort** | LOW — 1-2 hours to delete or add `verifyAdminAuth()` wrappers |
| **Time-to-value** | Immediate |
| **Risk** | LOW — removing debug endpoints won't affect production functionality |
| **Validation** | Attempt to access removed endpoints → should return 404 or 401 |

---

### 3. Create Staging / Separate Dev Database

| Attribute | Detail |
|---|---|
| **What to change** | Create a separate Supabase project for development/testing. Configure env vars to use different DB per environment. |
| **File/Area** | Replit Secrets (environment-specific), `lib/supabase/admin.ts`, `lib/supabase/server.ts` |
| **Impact on reliability** | HIGH — Currently dev and production share the same database. Schema changes, test data, and debugging queries affect live customer data. |
| **Effort** | MEDIUM — 1-2 days for Supabase project setup + data seeding + env configuration |
| **Time-to-value** | 1 week |
| **Risk** | LOW — purely additive; production remains unchanged |
| **Validation** | Dev env points to separate DB; production data unaffected by dev work |

---

### 4. Add Rate Limiting to Critical Customer Endpoints

| Attribute | Detail |
|---|---|
| **What to change** | Add rate limiting middleware to payment and order creation endpoints |
| **File/Area** | `app/api/customer/create-payment-intent/route.ts`, `app/api/customer/orders/route.ts`, `app/api/customer/forgot-password/route.ts` |
| **Impact on reliability** | MEDIUM — Prevents abuse and reduces risk of Stripe API rate limit hits |
| **Effort** | LOW — 2-4 hours using in-memory rate limiter or `@upstash/ratelimit` |
| **Time-to-value** | Immediate |
| **Risk** | LOW — may need tuning for legitimate high-traffic periods |
| **Validation** | Send rapid requests → verify 429 responses after threshold |

---

### 5. Add Global Maintenance Mode Kill-Switch

| Attribute | Detail |
|---|---|
| **What to change** | Add `MAINTENANCE_MODE` environment variable; check in `middleware.ts`; return 503 with friendly maintenance page |
| **File/Area** | `middleware.ts`, new `app/maintenance/page.tsx` |
| **Impact on reliability** | HIGH — Currently no way to gracefully take the platform offline during emergencies |
| **Effort** | LOW — 2-3 hours |
| **Time-to-value** | Immediate (available for next incident) |
| **Risk** | NONE — dormant until activated |
| **Validation** | Set `MAINTENANCE_MODE=true` → verify all customer routes show maintenance page; admin routes still accessible |

---

### 6. Build Order Health Dashboard in Admin

| Attribute | Detail |
|---|---|
| **What to change** | Create `/admin/order-health` page showing real-time order success rates, payment failures, stuck orders, per-restaurant health cards |
| **File/Area** | New `app/admin/order-health/page.tsx`, new API endpoint `/api/admin/order-health/route.ts` |
| **Impact on reliability** | HIGH — Currently no proactive visibility into order health. Issues discovered only when restaurants call. |
| **Effort** | MEDIUM — 1-2 days for basic dashboard |
| **Time-to-value** | 1 week |
| **Risk** | LOW — read-only dashboard, no data mutation |
| **Validation** | Dashboard shows accurate counts matching direct DB queries |

---

### 7. Add Slack/Webhook Alerting for P1 Events

| Attribute | Detail |
|---|---|
| **What to change** | Create a lightweight alert system that sends Slack notifications for critical events: payment failures, stuck orders, tablet offline |
| **File/Area** | New `lib/alerts/slack.ts`, integrate into cron and webhook handlers |
| **Impact on reliability** | HIGH — Enables proactive incident detection instead of waiting for restaurant calls |
| **Effort** | LOW — 3-4 hours for Slack webhook integration |
| **Time-to-value** | Immediate |
| **Risk** | LOW — risk of noisy alerts if thresholds not tuned properly |
| **Validation** | Trigger test alert → verify Slack message received with correct details |

---

### 8. Add Per-Restaurant Analytics to GA4 Events

| Attribute | Detail |
|---|---|
| **What to change** | Add `restaurant_id` and `restaurant_slug` as custom dimensions to all GA4 events |
| **File/Area** | `lib/analytics.ts` — modify all `trackEvent` calls to include restaurant context |
| **Impact on reliability** | MEDIUM — Enables per-restaurant conversion funnel analysis |
| **Effort** | LOW — 1-2 hours |
| **Time-to-value** | 1 week (data accumulation needed) |
| **Risk** | NONE — purely additive to existing analytics |
| **Validation** | Place test order → verify GA4 event contains `restaurant_id` dimension |

---

### 9. Implement Webhook Retry Queue for Stripe

| Attribute | Detail |
|---|---|
| **What to change** | Add retry mechanism for failed Stripe webhook processing. Currently a failed webhook is logged but not retried. |
| **File/Area** | `app/api/customer/stripe-webhook/route.ts`, potentially new `lib/webhooks/retry.ts` |
| **Impact on reliability** | MEDIUM — Prevents orders from getting stuck if webhook processing fails on first attempt |
| **Effort** | MEDIUM — 4-6 hours |
| **Time-to-value** | Immediate |
| **Risk** | LOW — idempotency already exists via `stripe_webhook_events` table |
| **Validation** | Simulate webhook failure → verify retry processes successfully |

---

### 10. Document and Automate Database Migration Safety

| Attribute | Detail |
|---|---|
| **What to change** | Create a migration checklist and pre-flight validation script. Since dev and prod share a database, migrations must be backward-compatible. |
| **File/Area** | New `scripts/migration-preflight.ts`, update `replit.md` with migration protocol |
| **Impact on reliability** | MEDIUM — Prevents accidental breaking schema changes |
| **Effort** | LOW — 2-3 hours for checklist + basic validation script |
| **Time-to-value** | Immediate |
| **Risk** | NONE |
| **Validation** | Run preflight script before next migration → verify it catches intentional breaking change |

---

## Summary Priority Matrix

| # | Recommendation | Impact | Effort | Priority Score |
|---|---|---|---|---|
| 1 | Sentry for Next.js | HIGH | LOW | **P0** |
| 2 | Remove debug endpoints | HIGH | LOW | **P0** |
| 5 | Maintenance mode kill-switch | HIGH | LOW | **P0** |
| 7 | Slack alerting | HIGH | LOW | **P0** |
| 4 | Rate limiting | MEDIUM | LOW | **P1** |
| 8 | GA4 restaurant dimensions | MEDIUM | LOW | **P1** |
| 6 | Order health dashboard | HIGH | MEDIUM | **P1** |
| 3 | Staging database | HIGH | MEDIUM | **P2** |
| 9 | Webhook retry queue | MEDIUM | MEDIUM | **P2** |
| 10 | Migration safety | MEDIUM | LOW | **P2** |

**Recommended execution order:** 1 → 2 → 5 → 7 → 4 → 8 → 6 → 3 → 9 → 10
