# Menu.ca — API & Endpoint Inventory
**Generated:** February 2026  
**Source:** Replit codebase audit  
**Total API routes found:** 201 route handlers across `app/api/`

---

## Section A — Architecture & Components Inventory

### A1) Repositories and Services

| Component | Type | Runtime | Framework | Started By | Owner |
|---|---|---|---|---|---|
| Menu.ca Admin Dashboard + Customer Ordering | Web App (monolith) | Replit (Node.js) | Next.js 14 (App Router, TypeScript) | `npm run dev` | Brian / Santiago |
| Supabase PostgreSQL | Database | Supabase Cloud (Neon-backed) | PostgreSQL (`menuca_v3` schema) | Managed service | Supabase |
| Supabase Auth | Auth Service | Supabase Cloud | Supabase Auth (email/password, Google OAuth) | Managed service | Supabase |
| Stripe | Payment Processing | Stripe Cloud | Stripe API (test + live mode per restaurant) | Managed service | Stripe |
| Twilio | Voice Calls | Twilio Cloud | Twilio REST API + TwiML | Managed service | Twilio |
| Resend | Email Service | Resend Cloud | Resend API + React Email templates | Managed service | Resend |
| Mapbox | Maps/Geocoding | Mapbox Cloud | Mapbox GL JS | Client-side | Mapbox |
| Google Places | Address Autocomplete | Google Cloud | Places API | Client-side | Google |
| RestoZone | Delivery Provider | Third-party | REST API | External | RestoZone |
| Order Fallback Cron | Worker/Cron | Replit (published app) | Next.js API route (`/api/cron/order-fallback`) | External cron trigger | Brian |
| Tablet App | Mobile App | React Native (`ca.menu.orders`) | React Native + Sentry | Standalone | Santiago |

**Dependency Graph:**
```
Customer Browser → Next.js App → Supabase PostgreSQL (menuca_v3)
                              → Stripe (payment intents, webhooks, refunds)
                              → Google Places (address autocomplete)
                              → Mapbox (delivery area maps)

Tablet App (React Native) → Next.js API (/api/tablet/*) → Supabase PostgreSQL

Admin Browser → Next.js App → Supabase PostgreSQL
                            → Stripe (refunds, payment config)
                            → Resend (email templates)
                            → Twilio (fallback call config)

Cron (external trigger) → /api/cron/order-fallback → Supabase (query unacked orders)
                                                    → Twilio REST API (outbound calls)

Twilio Voice → /api/twilio/voice/order-fallback (TwiML webhook)
             → Supabase (acknowledge order)

Stripe Webhook → /api/customer/stripe-webhook → Supabase (update payment status)
```

### A2) Configuration and Environment Variables

**Required to Boot (Next.js):**
| Key | Purpose | Storage |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Replit Secrets |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key | Replit Secrets |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin/service role key | Replit Secrets |

**Stripe (Payment Processing):**
| Key | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Live Stripe secret key |
| `TESTING_STRIPE_SECRET_KEY` | Test Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `VITE_STRIPE_PUBLIC_KEY` | Live publishable key (frontend) |
| `TESTING_VITE_STRIPE_PUBLIC_KEY` | Test publishable key (frontend) |
| `NEXT_PUBLIC_TESTING_VITE_STRIPE_PUBLIC_KEY` | Test publishable key (Next.js frontend) |

**Twilio (Voice Fallback):**
| Key | Purpose |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio account ID |
| `TWILIO_AUTH_TOKEN` | Twilio auth |
| `TWILIO_FROM_NUMBER` | Outbound caller ID |
| `TWILIO_VOICE_BASE_URL` | Public URL for voice webhooks |
| `TWILIO_VOICE_TOKEN` | Voice webhook authentication |
| `ORDER_FALLBACK_CRON_SECRET` | Cron endpoint authorization |

**Email (Resend):**
| Key | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend email sending |
| `RESEND_FROM_EMAIL` | From address for emails |

**Other:**
| Key | Purpose |
|---|---|
| `GOOGLE_API_KEY` | Google Places API |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox GL JS |
| `SESSION_SECRET` | Session encryption |
| `ADMIN_TEST_EMAIL` | Admin test credentials |
| `ADMIN_TEST_PASSWORD` | Admin test credentials |

**Configurable ENV (with defaults):**
| Key | Default | Purpose |
|---|---|---|
| `ORDER_FALLBACK_ACK_TIMEOUT_SECONDS` | 180 | Time before triggering fallback call |
| `ORDER_FALLBACK_DEVICE_OFFLINE_SECONDS` | 180 | Tablet offline threshold |
| `ORDER_FALLBACK_ONLINE_GRACE_SECONDS` | 180 | Extra grace if tablet online |
| `ORDER_FALLBACK_CALL_IF_ONLINE` | false | Call even if tablet online |
| `ORDER_FALLBACK_LOOKBACK_HOURS` | 24 | How far back to check orders |
| `ORDER_FALLBACK_MAX_ORDERS` | 50 | Max orders per cron run |

---

## Section B — API Endpoint Inventory

### B1) Customer-Facing API Endpoints

| Method | Path | Auth | Purpose | DB Tables Touched | Side Effects |
|---|---|---|---|---|---|
| POST | `/api/customer/create-payment-intent` | Supabase Auth (optional for guest) | Create Stripe PaymentIntent | `restaurants`, `delivery_and_pickup_configs`, `users`, `coupons` | Creates Stripe PaymentIntent, validates coupons server-side |
| POST | `/api/customer/orders` | Supabase Auth | Create order after payment | `orders`, `order_items`, `order_item_modifiers`, `payment_transactions` | Creates order record, sends confirmation email |
| POST | `/api/customer/orders/cash` | Supabase Auth | Create cash order (no Stripe) | `orders`, `order_items`, `order_item_modifiers` | Creates order record |
| GET | `/api/customer/orders/[id]` | Supabase Auth | Get order details | `orders`, `order_status_history` | None |
| GET/PUT | `/api/customer/profile` | Supabase Auth | Get/update customer profile | `users` | None |
| GET/POST | `/api/customer/addresses` | Supabase Auth | Manage delivery addresses | `user_addresses` | None |
| POST | `/api/customer/ensure-profile` | Supabase Auth | Create profile if missing | `users` | Creates Stripe customer |
| POST | `/api/customer/oauth-profile` | Supabase Auth | Ensure OAuth profile exists | `users` | Creates Stripe customer |
| POST | `/api/customer/forgot-password` | None | Password reset request | None | Triggers Supabase password reset |
| GET | `/api/customer/restaurants/[slug]/menu` | None (public) | Get restaurant menu | `restaurants`, `courses`, `dishes`, `dish_prices`, `ingredients` | None |
| GET | `/api/customer/restaurants/[slug]/delivery-fee` | None (public) | Calculate delivery fee | `delivery_and_pickup_configs`, `delivery_zones` | None |
| GET | `/api/customer/restaurants/[slug]/payment-config` | None (public) | Get payment mode (test/live) | `delivery_and_pickup_configs` | None |
| GET | `/api/customer/restaurants/[slug]/payment-options` | None (public) | Get available payment methods | `delivery_and_pickup_configs` | None |
| GET | `/api/customer/restaurants/[slug]/prep-time` | None (public) | Get current prep time | `delivery_and_pickup_configs` | None |
| GET | `/api/customer/restaurants/[slug]/auto-deals` | None (public) | Get auto-applied deals | `deals`, `deal_items` | None |
| GET | `/api/customer/restaurants/[slug]/past-orders` | Supabase Auth | Get user's past orders at restaurant | `orders`, `order_items` | None |
| POST | `/api/customer/restaurants/[slug]/analytics` | None | Track page view | None | Fires analytics event |
| GET | `/api/customer/dishes/[id]/modifiers` | None (public) | Get dish modifier groups | `modifier_groups`, `modifiers` | None |
| GET | `/api/customer/dishes/[id]/combo-modifiers` | None (public) | Get combo dish selections | `combo_groups`, `combo_group_dishes` | None |

### B2) Stripe Webhook

| Method | Path | Auth | Purpose | DB Tables Touched | Side Effects |
|---|---|---|---|---|---|
| POST | `/api/customer/stripe-webhook` | Stripe signature verification | Handle payment events | `stripe_webhook_events`, `payment_transactions`, `orders` | Updates payment status; idempotency via `stripe_webhook_events` table |

**Handled Events:** `payment_intent.succeeded`, `charge.refunded`  
**Idempotency:** Checks `stripe_webhook_events.stripe_event_id` before processing  
**Signature Verification:** `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`

### B3) Tablet API Endpoints

| Method | Path | Auth | Purpose | DB Tables Touched |
|---|---|---|---|---|
| POST | `/api/tablet/auth/register` | None (device key) | Register new tablet device | `devices`, `device_sessions` |
| POST | `/api/tablet/auth/login` | None (device key) | Login tablet device | `devices`, `device_sessions` |
| POST | `/api/tablet/auth/refresh` | Bearer token | Refresh session token | `device_sessions` |
| POST | `/api/tablet/heartbeat` | Bearer token | Send health telemetry | `devices` (updates `last_check_at` + health fields) |
| GET | `/api/tablet/orders` | Bearer token | List restaurant orders | `orders`, `order_items` |
| GET | `/api/tablet/orders/[id]` | Bearer token | Get single order | `orders`, `order_items`, `order_status_history` |
| PATCH | `/api/tablet/orders/[id]/status` | Bearer token | Update order status | `orders`, `order_status_history` |
| POST | `/api/tablet/orders/[id]/dispatch-driver` | Bearer token | Dispatch delivery driver | `orders` → RestoZone API |
| POST | `/api/tablet/recovery-ack` | Bearer token | Acknowledge recovery command | `device_recovery_commands` |
| GET | `/api/tablet/version` | None | Get latest app version | None |
| GET | `/api/tablet/debug-device` | Bearer token | Debug device info | `devices` |
| GET | `/api/tablet/test-bcrypt` | None | Test bcrypt (debug) | None |

### B4) Admin API Endpoints

| Method | Path | Auth | Purpose | DB Tables Touched |
|---|---|---|---|---|
| GET | `/api/restaurants` | Admin Auth | List all restaurants | `restaurants`, `restaurant_locations` |
| GET/PATCH | `/api/restaurants/[id]` | Admin Auth | Get/update restaurant | `restaurants` |
| POST | `/api/restaurants/toggle-online-ordering` | Admin Auth | Toggle ordering on/off | `delivery_and_pickup_configs` |
| GET/POST | `/api/restaurants/[id]/locations` | Admin Auth | Manage locations | `restaurant_locations` |
| GET/PATCH | `/api/restaurants/[id]/locations/[locationId]` | Admin Auth | Update location | `restaurant_locations` |
| GET/POST | `/api/restaurants/[id]/contacts` | Admin Auth | Manage contacts | `restaurant_contacts` |
| GET/POST | `/api/restaurants/[id]/delivery-zones` | Admin Auth | Manage delivery zones | `delivery_zones` |
| GET/PUT | `/api/restaurants/[id]/service-config` | Admin Auth | Delivery/pickup config | `delivery_and_pickup_configs` |
| GET/POST | `/api/restaurants/[id]/schedules` | Admin Auth | Manage schedules | `restaurant_schedules` |
| GET/POST | `/api/restaurants/[id]/tags` | Admin Auth | Manage restaurant tags | `restaurant_tags` |
| GET/POST | `/api/restaurants/[id]/subdomains` | Admin Auth | Manage subdomains | `restaurant_subdomains` |
| GET/POST | `/api/restaurants/[id]/payment-methods` | Admin Auth | Manage payment methods | `restaurant_payment_methods` |
| GET/POST | `/api/restaurants/[id]/payment-options` | Admin Auth | Payment options | `delivery_and_pickup_configs` |
| GET/PUT | `/api/restaurants/[id]/peak-hours` | Admin Auth | Peak hour config | `delivery_and_pickup_configs` |
| GET/POST | `/api/restaurants/[id]/seo` | Admin Auth | SEO settings | `restaurants` |
| PUT | `/api/restaurants/[id]/twilio-config` | Admin Auth | Twilio fallback config | `delivery_and_pickup_configs` |
| POST | `/api/restaurants/[id]/toggle-verified` | Admin Auth | Toggle verified status | `restaurants` |
| GET/POST | `/api/restaurants/[id]/integrations` | Admin Auth | Delivery provider integrations | `restaurant_integrations` |
| GET/POST | `/api/restaurants/[id]/menu-categories` | Admin Auth | Menu categories | `courses` |
| GET/PUT | `/api/restaurants/[id]/onboarding` | Admin Auth | Onboarding status | `restaurants` |

**Promotions/Deals/Coupons:**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET/POST | `/api/admin/promotions/deals` | Admin Auth | CRUD deals |
| POST | `/api/admin/promotions/deals/create` | Admin Auth | Create deal |
| GET/PATCH/DELETE | `/api/admin/promotions/deals/[id]` | Admin Auth | Manage deal |
| POST | `/api/admin/promotions/deals/[id]/toggle` | Admin Auth | Toggle deal active |
| POST | `/api/admin/promotions/deals/[id]/clone` | Admin Auth | Clone deal |
| GET | `/api/admin/promotions/deals/[id]/stats` | Admin Auth | Deal analytics |
| GET/POST | `/api/admin/promotions/campaigns` | Admin Auth | Manage campaigns |
| GET | `/api/admin/promotions/active` | Admin Auth | Active promotions |
| GET | `/api/admin/promotions/analytics` | Admin Auth | Promotion analytics |
| GET | `/api/admin/promotions/analytics/chart-data` | Admin Auth | Chart data |
| GET | `/api/admin/promotions/stats` | Admin Auth | Promotion stats |
| GET | `/api/admin/promotions/targeting` | Admin Auth | Item targeting |
| GET | `/api/admin/promotions/templates` | Admin Auth | Promotion templates |
| GET/POST | `/api/admin/promotions/upsells` | Admin Auth | Upsell management |
| GET | `/api/coupons` | Admin Auth | List coupons |

**Unified Modifier System:**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/admin/menu/unified-modifiers` | Admin Auth | List modifier library |
| GET/POST | `/api/admin/menu/unified-modifiers/groups` | Admin Auth | Modifier groups |
| GET/POST | `/api/admin/menu/unified-modifiers/groups/[groupId]/options` | Admin Auth | Group options |
| GET | `/api/admin/menu/unified-modifiers/categories` | Admin Auth | Modifier categories |
| GET/POST | `/api/admin/menu/unified-modifiers/dishes` | Admin Auth | Dish list for assignment |
| GET/POST | `/api/admin/menu/unified-modifiers/dish-assignments` | Admin Auth | Assign modifiers to dishes |

**Admin User Management:**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/admin-users` | Admin Auth | List admin users |
| POST | `/api/admin-users/create` | Admin Auth (Super Admin) | Create admin user |
| GET | `/api/admin-users/me` | Admin Auth | Current admin profile |
| GET/PATCH/DELETE | `/api/admin-users/[id]` | Admin Auth | Manage admin user |
| GET/POST | `/api/admin-users/[id]/restaurants` | Admin Auth | Restaurant assignments |
| DELETE | `/api/admin-users/[id]/restaurants/[restaurantId]` | Admin Auth | Remove assignment |
| GET | `/api/admin-users/assignments` | Admin Auth | All assignments |
| GET/POST | `/api/roles` | Admin Auth | Manage roles |

**Device/Tablet Admin:**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/admin/devices` | Admin Auth | List all devices + health |
| GET/PATCH/DELETE | `/api/admin/devices/[id]` | Admin Auth | Manage device |
| POST | `/api/admin/devices/[id]/regenerate-key` | Admin Auth | Regenerate device key |
| GET/POST | `/api/admin/devices/[id]/recovery` | Admin Auth | Recovery commands |

### B5) Cron & System Endpoints

| Method | Path | Auth | Purpose | DB Tables Touched | Side Effects |
|---|---|---|---|---|---|
| POST | `/api/cron/order-fallback` | `ORDER_FALLBACK_CRON_SECRET` header | Scan unacked orders, trigger calls | `orders`, `delivery_and_pickup_configs`, `restaurant_contacts`, `restaurant_locations`, `devices` | Twilio outbound calls |
| POST | `/api/twilio/voice/order-fallback` | `TWILIO_VOICE_TOKEN` query param | TwiML voice webhook (Polly.Joanna) | `orders` | Sets `acknowledged_at` on press 2 |

### B6) Additional Admin Route Groups

**Dashboard / Reports / Orders:**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/dashboard/*` | Admin Auth | Dashboard data queries |
| GET | `/api/orders/*` | Admin Auth | Order management and listing |
| GET | `/api/reports/*` | Admin Auth | Revenue/commission reports |

**Domain / Franchise / Onboarding:**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET/POST | `/api/domains/*` | Admin Auth | Custom domain management |
| GET/POST | `/api/franchise/*` | Admin Auth | Franchise hierarchy management |
| GET/POST | `/api/onboarding/*` | Admin Auth | Restaurant onboarding workflow |
| GET | `/api/provinces/*` | Admin Auth or Public | Province list for tax config |

**Menu Admin:**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET/POST | `/api/menu/*` | Admin Auth | Direct menu editing endpoints (separate from restaurant-scoped menu routes) |

**Promotions (top-level):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET/POST | `/api/promotions/*` | Admin Auth | Promotion management (parallel to `/api/admin/promotions/*`) |

**Migration / Schema Tools:**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/migrate/*` | Admin Auth | Data migration endpoints |
| POST | `/api/migrations/*` | Admin Auth | Schema migration endpoints |

### B7) Reference / Public Data

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/cities` | None (public) | List cities |
| GET | `/api/cuisines` | None (public) | List cuisines |
| GET | `/api/tags` | None (public) | List tags |
| GET | `/api/provinces` | None (public) | List provinces |
| GET | `/api/users` | Admin Auth | List users |
| GET/POST | `/api/users/addresses` | Auth | User addresses |
| GET/POST | `/api/users/favorites` | Auth | Favorite restaurants |
| GET | `/api/transactions` | Admin Auth | Transaction list |
| GET/POST | `/api/refunds` | Admin Auth | Manage refunds |
| GET/PATCH | `/api/refunds/[id]` | Admin Auth | Manage specific refund |
| GET | `/api/fallback-calls` | Admin Auth | Fallback call history |
| POST | `/api/storage/upload` | Admin Auth | File upload |

### B8) Debug / Test Endpoints (SECURITY RISK)

**WARNING:** The following endpoints have NO authentication and expose internal system information. They should be removed or gated behind admin auth in production.

| Method | Path | Auth | Purpose | Risk |
|---|---|---|---|---|
| GET | `/api/test-connection` | **NONE** | DB connectivity test | Exposes DB connection status |
| GET | `/api/test-restaurant` | **NONE** | Test restaurant query | Exposes restaurant data |
| GET | `/api/test-auth` | **NONE** | Test auth status | Exposes auth state |
| GET | `/api/check-public-tables` | **NONE** | Schema inspection | Exposes table/schema info |
| GET | `/api/tablet/test-bcrypt` | **NONE** | Test bcrypt hashing | Should not exist in production |
| GET | `/api/debug-data` | **UNKNOWN** | Debug data dump | Potentially exposes internal data |
| GET | `/api/debug-schema` | **UNKNOWN** | Schema debug info | Exposes database schema |
| GET | `/api/admin/db-inspector` | Admin Auth | Database inspector | Acceptable (admin-gated) |

### B3) Auth & Roles Summary

| User Type | Auth Mechanism | Token/Session | Lifetime | Enforcement |
|---|---|---|---|---|
| **Customer** | Supabase Auth (email/password + Google OAuth) | Supabase session cookie (httpOnly) | Managed by Supabase (refresh token rotation) | `createClient()` in API routes; middleware refreshes session |
| **Admin** | Supabase Auth + `admin_users` table check | Supabase session cookie | Same as customer | `verifyAdminAuth()` in `lib/auth/admin-check.ts` |
| **Super Admin** | Same as Admin + `role_id` check | Same | Same | `verifyAdminAuth()` returns `role_id`; checked per-route |
| **Restaurant Admin** | Same as Admin + restaurant assignment check | Same | Same | `verifyRestaurantAccess()` in `lib/rbac.ts` |
| **Tablet Device** | Bearer token (bcrypt-hashed device key + session token) | Session token in `device_sessions` table | Configurable expiry | `verifyDeviceAuth()` in `lib/tablet/verify-device.ts` |
| **Cron Job** | `ORDER_FALLBACK_CRON_SECRET` header | N/A (stateless) | N/A | Checked in `/api/cron/order-fallback` |
| **Stripe Webhook** | `stripe-signature` header (HMAC) | N/A | N/A | `stripe.webhooks.constructEvent()` |
| **Twilio Voice** | `TWILIO_VOICE_TOKEN` query parameter | N/A | N/A | Checked in `/api/twilio/voice/order-fallback` |

**Risk: Endpoints potentially missing auth:**
- `/api/test-connection`, `/api/test-restaurant`, `/api/test-auth`, `/api/check-public-tables` — debug/test endpoints that should be removed or gated in production
- `/api/tablet/test-bcrypt` — debug endpoint, should be removed in production
