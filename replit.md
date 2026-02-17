# Menu.ca Admin Dashboard

## Overview
The Menu.ca Admin Dashboard is a Next.js 14 application for managing a multi-tenant restaurant ordering platform, integrated with a Supabase PostgreSQL database. Its primary purpose is to streamline the administration of restaurants, orders, coupons, and user accounts, thereby enhancing operational efficiency. The business vision is to provide a robust, scalable, and intuitive platform, positioning Menu.ca as a leading solution in the online food ordering market.

## User Preferences
Preferred communication style: Simple, everyday language.
CRITICAL: NEVER add postgresql-16 to .replit modules. This project uses external Supabase PostgreSQL, NOT the Replit built-in database. Adding postgresql-16 causes a database migration step during publishing that blocks deployment.

## System Architecture

### Frontend
-   **Framework**: Next.js 14 (App Router, TypeScript, Server & Client Components).
-   **UI/UX**: Tailwind CSS, shadcn/ui (Radix UI), `next-themes` for dark/light mode, responsive design.
-   **Authentication**: Supabase Auth (email/password) with middleware-based route protection.
-   **State Management**: React Query for server state, React Hook Form with Zod for forms, Zustand for customer-facing shopping cart.

### Backend & Data Layer
-   **Database**: Supabase PostgreSQL (`public` and `menuca_v3` schemas), with specific Supabase client configuration for `menuca_v3`.
-   **Data Operations**: Primarily SQL Functions for reads and Edge Functions for writes.
-   **Admin Users**: Custom tables with RLS bypass and a 2-role schema (Super Admin, Restaurant Admin).

### Core Features
-   **Restaurant Management**: Tools for status, online ordering toggle, contact, and delivery area configuration.
-   **Menu Management**: Unified Menu Builder, Advanced Modifier System, Size & Price Variants, Dish Availability, Combo Group Dish Selections, item targeting for deals and coupons.
-   **Franchise Management**: Hierarchical system for linking restaurants and performing bulk updates.
-   **Categorization System**: Cuisine and tag-based discovery for restaurants.
-   **Customer Ordering System**: Separate Supabase Auth (including Google OAuth), Delivery vs. Pickup order types with contextual fees and scheduling, Multi-step Checkout Flow, Account Pages for order history and addresses, Server-side validation, Default branding, Enhanced order customization, dynamic prep times.
-   **Promotions**: Comprehensive coupon and deal management including item targeting, tiered discounts, and usage limits.
-   **Subdomain Routing**: Supports branded subdomain URLs (e.g., `restaurant.menu.ca`) with dynamic mapping and caching.
-   **Payment Mode Toggle**: Allows per-restaurant switching between test and live Stripe payments.
-   **Provincial Tax System**: Dynamic provincial tax calculation with per-restaurant rates and itemized tax lines.
-   **Delivery Providers System**: Extensible third-party integration system for delivery providers (e.g., RestoZone) for fee calculation and driver dispatch.
-   **Bilingual Translations**: Support for French translations for promotional deals and coupons with English fallback, and bilingual dish names.
-   **Twilio Order Fallback System**: Automated phone call notifications to restaurants when tablet orders aren't acknowledged within 3 minutes, using Polly.Joanna voice and DTMF input.
-   **Accounting & Reporting**: Full accounting system for restaurant statements, commission reports with carry-over balances, vendor commission tracking, batch processing, and automated invoicing. This system uses custom database tables and specific HST calculation rules.
-   **Performance Optimization**: Parallel data fetching, menu caching with auto-invalidation.
-   **RBAC Security Hardening**: Comprehensive role-based access control with `verifyAdminAuth` and `verifyRestaurantAccess()` functions.

## External Dependencies

### Backend Services
-   **Supabase**: PostgreSQL database, authentication, real-time subscriptions.

### UI Libraries
-   **Radix UI**: Headless component primitives.
-   **Lucide React**: Icon library.
-   **Recharts**: Charting library.

### Integrations
-   **Mapbox GL JS**: Delivery area drawing.
-   **@hello-pangea/dnd**: Drag-and-drop reordering.
-   **Stripe**: Payment processing.
-   **Google Places API**: Address autocomplete and verification.
-   **RestoZone**: Third-party delivery provider.
-   **Twilio**: Voice calls for order fallback notifications.

## Twilio Order Fallback System

### Purpose
Protects restaurants from missed orders when tablets aren't acknowledged. If an order isn't acknowledged within 3 minutes, the system automatically calls the restaurant to notify them. Hard limit of 3 calls per order — after that, calls stop permanently.

### Complete System Flow (End to End)
1. Customer places order -> `orders` table gets a new row with `acknowledged_at = NULL`
2. Tablet app sends heartbeats to `/api/tablet/heartbeat` -> updates `devices.last_check_at` (this is how the cron knows if the tablet is online)
3. Cron job runs every 2 minutes -> queries orders where `payment_status = 'paid'` AND `acknowledged_at IS NULL` AND older than 3 minutes
4. For each eligible order, cron checks `delivery_and_pickup_configs.twilio_call = true` for the restaurant
5. Cron calls `attemptFallbackCall()` which checks attempt count and retry timing in `special_instructions`
6. If eligible, Twilio REST API places outbound call to restaurant phone
7. Twilio hits our voice webhook at `/api/twilio/voice/order-fallback` to get TwiML
8. Polly.Joanna voice reads order details, restaurant presses 1 (repeat) or 2 (confirm)
9. Pressing 2 -> `markOrderAcknowledgedByPhone()` sets `acknowledged_at` on the order -> order drops out of cron query forever

### Hard Stop Safeguards (Max 3 Calls)
- Call attempts (both successful and failed) are tracked via `[TWILIO_FALLBACK_CALL]` markers in `orders.special_instructions`
- After 3 total attempts, `forceAcknowledgeAfterMaxCalls()` auto-sets `acknowledged_at` with a `[TWILIO_FALLBACK_MAX_REACHED]` note
- This means the order drops out of the cron query permanently, even if pressing "2" never worked
- In-memory `processedOrderIds` Set in the cron prevents the same order being called twice in a single cron run
- 3-minute spacing between retry attempts (RETRY_INTERVAL_MS)

### Tablet Heartbeat Connection
- The tablet app (React Native, `ca.menu.orders`) sends periodic POST requests to `/api/tablet/heartbeat`
- This updates `devices.last_check_at` which the cron uses to determine if the tablet is online/offline
- Heartbeat also stores health telemetry: `last_successful_fetch`, `consecutive_fetch_failures`, `oldest_pending_order_minutes`, `battery_level`, `printer_status`, `app_version`
- Auth: Bearer token from `device_sessions` table, validated via `lib/tablet/verify-device.ts`
- CRITICAL: `lib/tablet/auth.ts` queries custom tables (`devices`, `device_sessions`, `device_configs`, `device_recovery_commands`) that are NOT in auto-generated Supabase types. ALL Supabase clients in this file MUST use `createAdminClient() as any`
- If the heartbeat returns 500, it shows up as an AxiosError in Sentry from the React Native app (project: `react-native`, release: `ca.menu.orders@X.X.X`). This is NOT a random error — it means the tablet API is broken.
- Heartbeat response includes pending recovery commands (if any) for remote recovery

### Tablet Health Monitoring System (Feb 2026)
- Dashboard at `/admin/devices` shows real-time health status for all tablets
- Health telemetry is stored on the `devices` table (requires migration: `scripts/migrations/add-device-health-columns.sql`)
- Health status levels: healthy (green), warning (yellow, >2min stale), critical (red, >5min stale or >=3 failures), offline (gray, >2min no heartbeat), unknown (never connected)
- Auto-refreshes every 15 seconds
- Remote recovery commands: `resync` (re-auth + fetch) and `reload_app` (full app restart)
- Commands delivered via heartbeat response with 2-minute TTL
- Tablet acknowledges commands via `POST /api/tablet/recovery-ack`
- Command audit trail: who issued, when, execution status
- Key files:
  - `app/admin/devices/page.tsx` - Health monitoring dashboard
  - `app/api/admin/devices/[id]/recovery/route.ts` - Recovery command API (GET history, POST new command)
  - `app/api/tablet/recovery-ack/route.ts` - Tablet command acknowledgment
  - `lib/hooks/use-devices.ts` - React hooks for device health data + recovery commands
  - `scripts/migrations/add-device-health-columns.sql` - Database migration (MUST RUN in Supabase)

### Phone Number Lookup Priority
1. `restaurant_contacts` where `receives_orders = true` AND `is_active = true` (menuca_v3 schema)
2. `restaurant_locations` where `is_active = true`, ordered by `is_primary` (menuca_v3 schema)

### Required Secrets
- `TWILIO_ACCOUNT_SID`: Twilio account identifier
- `TWILIO_AUTH_TOKEN`: Twilio authentication token
- `TWILIO_FROM_NUMBER`: Outbound caller ID (e.g., +16135551234)
- `TWILIO_VOICE_BASE_URL`: Public URL for voice webhooks (e.g., https://menuv3.replit.app)
- `TWILIO_VOICE_TOKEN`: Security token for voice webhook authentication
- `ORDER_FALLBACK_CRON_SECRET`: Secret for cron endpoint authorization

### Configuration Environment Variables
- `ORDER_FALLBACK_ACK_TIMEOUT_SECONDS`: Time before triggering call (default: 180)
- `ORDER_FALLBACK_DEVICE_OFFLINE_SECONDS`: Tablet offline threshold (default: 180)
- `ORDER_FALLBACK_ONLINE_GRACE_SECONDS`: Extra grace if tablet online (default: 180)
- `ORDER_FALLBACK_CALL_IF_ONLINE`: Call even if tablet online (default: false)
- `ORDER_FALLBACK_LOOKBACK_HOURS`: How far back to check orders (default: 24)
- `ORDER_FALLBACK_MAX_ORDERS`: Max orders per cron run (default: 50)

### Key Files (ONLY these files exist for fallback logic)
- `app/api/twilio/voice/order-fallback/route.ts` - THE ONLY voice webhook (Polly.Joanna, handles press 1/2)
- `app/api/cron/order-fallback/route.ts` - Cron endpoint (scans unacknowledged orders, calls attemptFallbackCall)
- `lib/twilio/order-fallback.ts` - THE ONLY fallback logic file (attempt tracking, acknowledgment, phone lookup, force-acknowledge after max calls)
- `lib/twilio/calls.ts` - Twilio REST API wrapper (makeCall)
- `lib/fallback/order-summary.ts` - Speech text builder (buildOrderFallbackMessage)
- `scripts/order-fallback-cron.ts` - Scheduled deployment script
- `app/api/tablet/heartbeat/route.ts` - Tablet heartbeat endpoint (updates devices.last_check_at)
- `lib/tablet/auth.ts` - Device auth, session management, heartbeat update (MUST use `as any` on createAdminClient)
- `lib/tablet/verify-device.ts` - Bearer token verification for tablet API

### Bugs We Have Hit Before (LEARN FROM THESE)
1. **Infinite call loops (Feb 2026)**: Voice webhook was importing `recordFallbackCallAttempt` from a legacy file (`lib/fallback/order-fallback.ts`, now DELETED) instead of `markOrderAcknowledgedByPhone` from `lib/twilio/order-fallback.ts`. The legacy function only wrote a note but NEVER set `acknowledged_at`, so the cron kept picking up the same order forever. LESSON: There is only ONE fallback logic file: `lib/twilio/order-fallback.ts`. The legacy file has been deleted.
2. **Tablet heartbeat 500s in Sentry (Feb 2026)**: `lib/tablet/auth.ts` was using `createAdminClient()` without `as any`, causing TypeScript to resolve custom table queries to `never` type and crash at runtime. Sentry shows this as an AxiosError from `ca.menu.orders` React Native app. LESSON: Always use `createAdminClient() as any` when querying custom tables not in auto-generated Supabase types.
3. **Failed calls not counting toward limit (Feb 2026)**: Only "Call placed" markers were counted, not "Call failed". Persistent failures could retry indefinitely. LESSON: The regex now counts both placed AND failed markers toward the 3-call max.

### Deploying Changes
- The cron job and Twilio webhooks hit the PUBLISHED production app, NOT the dev environment
- Changes to fallback logic, voice webhook, or heartbeat MUST be published to take effect
- Always publish after making changes to any file listed above

### Supabase Schema Note
- ALL tables used by this system are in the `menuca_v3` schema
- `createAdminClient()` already defaults to `menuca_v3` but custom tables (devices, device_sessions, device_configs) need `as any` cast because they are not in auto-generated types