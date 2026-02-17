# Menu.ca — Incident Runbook (v0)
**Generated:** February 2026  
**Source:** Codebase analysis + operational patterns

---

## Incident Classification

| Severity | Definition | Response Time | Example |
|---|---|---|---|
| **P1 — Critical** | Revenue-impacting: customers cannot place orders, payments failing | Immediate (< 15 min) | Stripe webhook down, checkout 500 errors |
| **P2 — High** | Degraded: orders going through but not reaching restaurant | < 30 min | Tablet offline, fallback calls not working |
| **P3 — Medium** | Partial impact: specific restaurant or feature broken | < 2 hours | Single restaurant menu not loading, refund failing |
| **P4 — Low** | Non-urgent: cosmetic, analytics, or admin-only issues | Next business day | Dashboard display bug, analytics not firing |

---

## Runbook 1: Checkout / Payment Failures

### Symptoms
- Customers report "payment failed" errors
- Order volume drops to zero suddenly
- Stripe dashboard shows payment_intent creation failures

### Confirm Incident
1. Check Stripe Dashboard → Developers → Logs for recent errors
2. Query orders table: `SELECT COUNT(*), payment_status FROM orders WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY payment_status`
3. Check application logs for errors in `/api/customer/create-payment-intent`

### Mitigate
1. **If Stripe API is down:** Nothing to do — wait for Stripe recovery. Post status update.
2. **If webhook is broken:** Check `/api/customer/stripe-webhook` for errors. Verify `STRIPE_WEBHOOK_SECRET` is set correctly.
3. **If code bug:** Rollback to last working checkpoint via Replit Checkpoints.
4. **If wrong Stripe key:** Verify `TESTING_STRIPE_SECRET_KEY` and `STRIPE_SECRET_KEY` are set in Replit Secrets.

### Recover
1. After fix, monitor Stripe dashboard for successful payments
2. Check for orders created without payment confirmation — manually verify in Stripe
3. Replay any failed webhook events from Stripe Dashboard → Webhooks → Attempted deliveries

### Notify
- Brian (immediate)
- Affected restaurant owners if orders were missed

### Post-Incident
- [ ] Root cause identified
- [ ] Fix deployed and verified
- [ ] Webhook replay completed if needed
- [ ] Document in incident log

---

## Runbook 2: Tablet Offline / Orders Not Reaching Restaurant

### Symptoms
- Restaurant reports "not receiving orders"
- Tablet health dashboard shows device offline/critical
- Twilio fallback calls being triggered
- Sentry shows `AxiosError` from `ca.menu.orders` app

### Confirm Incident
1. Check `/admin/devices` for tablet health status
2. Query: `SELECT id, name, last_check_at, health_status FROM devices WHERE restaurant_id = X`
3. Check for recent fallback calls: `SELECT * FROM orders WHERE restaurant_id = X AND special_instructions LIKE '%TWILIO_FALLBACK%' ORDER BY created_at DESC LIMIT 5`

### Mitigate
1. **Send recovery command:** Use `/admin/devices` → click device → "Resync" or "Reload App"
2. **If tablet app crashed:** Ask restaurant to force-close and reopen the app
3. **If network issue:** Ask restaurant to check WiFi/data connection
4. **If tablet heartbeat API broken:** Check `/api/tablet/heartbeat` for errors. Remember: `lib/tablet/auth.ts` MUST use `createAdminClient() as any` for custom tables.

### Recover
1. Verify tablet reconnects (health status goes green on dashboard)
2. Check for any unacknowledged orders that need manual attention
3. If orders were missed, contact restaurant and help them find the orders

### Notify
- Brian (for system issues)
- Restaurant owner (if they haven't already reported)

### Post-Incident
- [ ] Tablet reconnected and receiving orders
- [ ] All unacked orders accounted for
- [ ] Root cause documented (network? app crash? API bug?)

---

## Runbook 3: Twilio Fallback System Not Working

### Symptoms
- Orders stuck as unacknowledged for > 10 minutes
- No fallback calls being placed despite tablet being offline
- `[TWILIO_FALLBACK_MAX_REACHED]` markers appearing too quickly

### Confirm Incident
1. Check if cron is running: Look for recent `POST /api/cron/order-fallback` in logs
2. Verify Twilio credentials: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` are set
3. Check Twilio Console → Monitor → Call Logs for recent call attempts
4. Verify `TWILIO_VOICE_BASE_URL` points to published app URL
5. Check restaurant has `twilio_call = true` in `delivery_and_pickup_configs`

### Mitigate
1. **If cron not running:** Manually trigger: `curl -X POST https://menuv3.replit.app/api/cron/order-fallback -H "x-cron-secret: <ORDER_FALLBACK_CRON_SECRET>"`
2. **If Twilio credentials wrong:** Update in Replit Secrets and re-publish
3. **If voice webhook broken:** Check `/api/twilio/voice/order-fallback` — verify `TWILIO_VOICE_TOKEN` matches
4. **If infinite call loop:** Check that `markOrderAcknowledgedByPhone()` is being called from `lib/twilio/order-fallback.ts` (NOT a legacy file). Verify it sets `acknowledged_at`.

### Known Bug History
- **Feb 2026:** Voice webhook imported from legacy file that didn't set `acknowledged_at` → infinite calls. Fixed by deleting legacy file and using only `lib/twilio/order-fallback.ts`.
- **Feb 2026:** Failed calls not counted toward 3-call limit → persistent failures. Fixed by counting both placed AND failed markers.

### Recover
1. After fix, re-publish the app (cron + webhooks hit production URL)
2. Manually acknowledge any stuck orders if needed
3. Monitor next few orders for proper fallback behavior

---

## Runbook 4: Database / Supabase Issues

### Symptoms
- All API calls returning 500 errors
- "connection refused" or timeout errors in logs
- Dashboard and ordering both broken simultaneously

### Confirm Incident
1. Check Supabase status: status.supabase.com
2. Try direct query: `/api/test-connection` endpoint
3. Check Supabase Dashboard → Database → Connection pooler status

### Mitigate
1. **If Supabase outage:** Wait for Supabase recovery. Nothing to do on our end.
2. **If connection pool exhausted:** Restart the application (Replit will restart the Node.js process)
3. **If credentials wrong:** Verify `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in Replit Secrets

### Critical Notes
- Dev and production share the SAME database. A migration error affects both immediately.
- ALL queries must use `.schema('menuca_v3')` — missing this causes silent failures.
- Custom tables (devices, device_sessions) need `createAdminClient() as any` cast.

---

## Runbook 5: Subdomain Routing Broken

### Symptoms
- Restaurant branded URL (e.g., `seasonspizzaottawa.menu.ca`) shows wrong content or 404
- Middleware logs show "NOT FOUND" for subdomain

### Confirm Incident
1. Check middleware logs for `[Middleware] Looking up subdomain: X`
2. Verify subdomain mapping: Check `restaurant_subdomains` table or `get_all_subdomain_mappings` RPC
3. Check cache: Subdomain cache TTL is 5 minutes — may be stale

### Mitigate
1. **If DNS issue:** Check DNS records point to Replit deployment
2. **If mapping missing:** Add to `restaurant_subdomains` table via admin
3. **If cache stale:** Wait 5 minutes for cache to refresh, or restart app
4. **If static fallback needed:** Add entry to `STATIC_SUBDOMAIN_MAPPINGS` in `lib/subdomain-mapping.ts`

---

## Runbook 6: Deploy Gone Wrong

### Symptoms
- App broken immediately after publishing
- New errors appearing in logs post-deploy

### Confirm Incident
1. Check Replit deployment logs
2. Compare behavior to pre-deploy (recent checkpoint)

### Mitigate
1. **Immediate:** Use Replit Checkpoints to rollback to last working state
2. **Re-publish** from the rolled-back checkpoint
3. **Verify** all critical paths: checkout, tablet API, webhooks

### Recover
1. Identify the breaking change in the deploy diff
2. Fix the issue in dev
3. Re-test against shared database
4. Re-publish

---

## General Incident Log Template

```markdown
## Incident: [Title]
**Date:** YYYY-MM-DD HH:MM ET
**Severity:** P1/P2/P3/P4
**Duration:** X minutes
**Detected by:** [How we found out]
**Affected:** [What was broken]

### Timeline
- HH:MM — Issue detected
- HH:MM — Investigation started
- HH:MM — Root cause identified
- HH:MM — Fix deployed
- HH:MM — Verified resolved

### Root Cause
[Description]

### Resolution
[What was done to fix it]

### Prevention
[What will prevent recurrence]
- [ ] Action item 1
- [ ] Action item 2
```
