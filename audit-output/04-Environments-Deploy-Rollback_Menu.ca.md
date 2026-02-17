# Menu.ca — Environments, Deploy & Rollback
**Generated:** February 2026  
**Source:** Replit project config, `replit.md`, codebase analysis

---

## Section D — Environments

### D1) Environment Map

| Environment | URL | Database | Stripe Mode | Twilio | Notes |
|---|---|---|---|---|---|
| **Development** | `https://<repl-slug>.replit.dev` (Replit dev URL) | Supabase PostgreSQL (`menuca_v3` schema) — SAME as production | Per-restaurant (`test` or `live` via `payment_mode` column) | Live credentials (same as prod) | Dev and prod share the same database — changes are immediate |
| **Production** | `https://menuv3.replit.app` + `https://orders.menu.ca` + branded subdomains (e.g., `seasonspizzaottawa.menu.ca`) | Supabase PostgreSQL (`menuca_v3` schema) — SAME as dev | Per-restaurant | Live credentials | Published via Replit Deployments |

**CRITICAL:** There is NO staging environment. Dev and production share the SAME Supabase database. All database changes in dev immediately affect production data.

### Branded Subdomain URLs

| Subdomain | Restaurant | Restaurant ID |
|---|---|---|
| `seasonspizzaottawa.menu.ca` | Seasons Pizza Ottawa | 83 |
| `centertowndonair.menu.ca` | Centertown Donair & Pizza | 131 |
| `orchidsushiottawa.menu.ca` | Orchid Sushi | 245 |
| `goldencenterpizza.menu.ca` | Golden Center Pizza | 815 |
| `bronson.papajoesottawa.menu.ca` | Papa Joe's Pizza Downtown | 13 |

Subdomain mappings come from database RPC (`get_all_subdomain_mappings`) with static fallback in `lib/subdomain-mapping.ts`. Cache TTL: 5 minutes.

### Third-Party Integration Environments

| Service | Dev | Prod | Switch Mechanism |
|---|---|---|---|
| **Stripe** | `TESTING_STRIPE_SECRET_KEY` (test mode) | `STRIPE_SECRET_KEY` (live mode) | Per-restaurant `payment_mode` in `delivery_and_pickup_configs` |
| **Supabase** | Same project (shared) | Same project (shared) | N/A — single database |
| **Twilio** | Same credentials (shared) | Same credentials (shared) | N/A — same account |
| **Resend** | Same credentials (shared) | Same credentials (shared) | N/A — same account |
| **Google API** | Same key (shared) | Same key (shared) | N/A |
| **Mapbox** | Same token (shared) | Same token (shared) | N/A |

---

### D2) Deployment Procedure

| Step | Details |
|---|---|
| **Code hosting** | Replit workspace (Git-backed) |
| **Branch strategy** | Single branch (main). No PR/review process. |
| **Build process** | Next.js build triggered by Replit Deployments |
| **Deploy trigger** | Manual — "Publish" button in Replit UI |
| **Who can deploy** | Brian (workspace owner) |
| **Typical deploy time** | ~2-5 minutes (Next.js build + deployment) |
| **Deploy risks** | No staging verification. Shared database means migrations affect live data immediately. |

**Deploy Flow:**
```
1. Make code changes in Replit dev environment
2. Test manually against shared database
3. Click "Publish" in Replit UI
4. Replit builds Next.js app
5. Deploys to menuv3.replit.app
6. DNS routes orders.menu.ca → Replit deployment
7. All branded subdomains also serve from same deployment
```

**What Happens During Deploy:**
- The published app goes offline briefly during build
- Cron jobs and webhooks hitting the published URL will get errors during this window
- Tablet heartbeats will fail temporarily (React Native app handles retries)
- No blue-green or zero-downtime deployment

---

### D3) Rollback & Kill-Switches

#### Current Rollback Capabilities

| Mechanism | Available? | How |
|---|---|---|
| **Code rollback** | YES | Replit Checkpoints — automatic snapshots before each change. Can restore code + database state. |
| **Previous deployment** | YES | Replit keeps previous deployment. Can re-publish from a checkpoint. |
| **Database rollback** | PARTIAL | Replit checkpoint includes database state. Supabase also has point-in-time recovery (PITR) on Pro plan. |
| **Git revert** | YES | Git history available; can revert commits and re-publish |

#### Feature Flags / Kill-Switches

| Kill-Switch | Exists? | How to Use |
|---|---|---|
| **Disable online ordering (per restaurant)** | YES | `POST /api/restaurants/toggle-online-ordering` — toggles `is_online_ordering_active` |
| **Payment mode toggle** | YES | Per-restaurant `payment_mode` in `delivery_and_pickup_configs` — switch between test/live Stripe |
| **Twilio fallback toggle** | YES | Per-restaurant `twilio_call` boolean in `delivery_and_pickup_configs` |
| **Analytics disable** | YES | `setAnalyticsDisabled()` in `lib/analytics.ts` — client-side only |
| **Global ordering disable** | NO | No single switch to disable all ordering platform-wide |
| **Maintenance mode** | NO | No maintenance page or read-only mode |
| **Feature flags system** | NO | No LaunchDarkly, Unleash, or custom feature flag system |

#### Proposed Kill-Switches (Missing)

| Switch | Priority | Implementation |
|---|---|---|
| **Global maintenance mode** | HIGH | Add `MAINTENANCE_MODE` env var checked in middleware; return 503 with maintenance page |
| **Disable new checkouts** | HIGH | Check flag in `/api/customer/create-payment-intent`; return friendly error |
| **Disable webhooks** | MEDIUM | Early return in `/api/customer/stripe-webhook` when flag set |
| **Disable cron** | LOW | Already controllable by not triggering the cron externally |

#### "Safe Mode" Plan (Minimal Ordering Path)

If the system is in crisis, the minimum viable ordering path is:

1. **Keep Supabase accessible** — database must be up
2. **Keep Stripe webhooks processing** — payment confirmation flow
3. **Disable all non-essential features** (promotions, analytics, deals, upsells)
4. **Keep tablet API operational** — restaurants need to receive orders
5. **Fallback: disable online ordering** for affected restaurants while debugging

**Emergency Contacts:**
- Supabase: status.supabase.com, support dashboard
- Stripe: dashboard.stripe.com/test/logs for webhook inspection
- Twilio: console.twilio.com for call logs
- Replit: Checkpoints for code/db rollback
