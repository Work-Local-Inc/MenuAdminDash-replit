# Menu.ca Admin Dashboard

## Overview
The Menu.ca Admin Dashboard is a Next.js 14 application for managing a multi-tenant restaurant ordering platform, integrated with a Supabase PostgreSQL database. Its primary purpose is to streamline the administration of restaurants, orders, coupons, and user accounts, thereby enhancing operational efficiency. The business vision is to provide a robust, scalable, and intuitive platform, positioning Menu.ca as a leading solution in the online food ordering market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Framework**: Next.js 14 (App Router, TypeScript, Server & Client Components).
-   **UI/UX**: Tailwind CSS, shadcn/ui (Radix UI), `next-themes` for dark/light mode, responsive design.
-   **Authentication**: Supabase Auth (email/password) with middleware-based route protection.
-   **State Management**: React Query for server state, React Hook Form with Zod for forms, Zustand for customer-facing shopping cart.

### Backend & Data Layer
-   **Database**: Supabase PostgreSQL (`public` and `menuca_v3` schemas). The `menuca_v3` schema is critical for restaurant platform data and requires specific Supabase client configuration.
-   **Data Operations**: Primarily SQL Functions for reads and Edge Functions for writes.
-   **Admin Users**: Custom tables with RLS bypass for granular control and a simplified 2-role schema (Super Admin, Restaurant Admin).

### Core Features
-   **Restaurant Management**: Tools for status, online ordering toggle, contact, and delivery area configuration.
-   **Menu Management**: Unified Menu Builder, Advanced Modifier System, Size & Price Variants, Dish Availability, Combo Group Dish Selections, item targeting for deals and coupons.
-   **Franchise Management**: Hierarchical system for linking restaurants and performing bulk updates.
-   **Categorization System**: Cuisine and tag-based discovery for restaurants.
-   **Customer Ordering System**: Separate Supabase Auth (including Google OAuth), Delivery vs. Pickup order types with contextual fees and scheduling, Multi-step Checkout Flow, Account Pages for order history and addresses, Server-side validation for security, Default branding system, Enhanced order customization, dynamic prep times.
-   **Promotions**: Comprehensive coupon and deal management including item targeting, tiered discounts, and usage limits.
-   **Subdomain Routing**: Supports branded subdomain URLs (e.g., `restaurant.menu.ca`) with dynamic mapping and caching.
-   **Payment Mode Toggle**: Allows per-restaurant switching between test and live Stripe payments.
-   **Provincial Tax System**: Dynamic provincial tax calculation with per-restaurant rates and itemized tax lines.
-   **Delivery Providers System**: Extensible third-party integration system for delivery providers (e.g., RestoZone) for fee calculation and driver dispatch.
-   **Bilingual Translations**: Support for French translations for promotional deals and coupons with English fallback, and bilingual dish names.
-   **Twilio Order Fallback System**: Automated phone call notifications to restaurants when tablet orders aren't acknowledged within 3 minutes. Uses natural-sounding Polly.Joanna voice to read order details and accepts DTMF input (press 1 to repeat, press 2 to confirm).

### Technical Implementations
-   **ID Mapping**: Handles `combo_groups.restaurant_id` (V3 IDs) vs. `dishes.restaurant_id` (legacy_v1_id) via API.
-   **Terminology**: "Template" in DB translates to "modifier" or "modifier group" in UI/code.
-   **Contact Information Storage**: Primary source is `restaurant_contacts` table (menuca_v3 schema) with fallbacks.
-   **Performance Optimization**: Parallel data fetching, menu caching with auto-invalidation.
-   **Modifier Table Schema**: Distinction between legacy and active modifier tables.
-   **API Routing for Subdomains**: `getApiBaseUrl()` helper ensures API calls from branded subdomains route correctly.
-   **Stripe Key Management**: Ensures Stripe keys match the active payment mode.
-   **Coupon Validation**: Server-side validation of coupon codes at payment intent creation, including item targeting, tiered discounts, and usage limits.
-   **RBAC Security Hardening**: Comprehensive role-based access control with `verifyAdminAuth` and `verifyRestaurantAccess()` functions applied to critical endpoints to prevent unauthorized and cross-restaurant access.
-   **Payment Method Detection**: Stripe orders have `stripe_payment_intent_id` set but `payment_method` may be null in the orders table. Reports check for `stripe_payment_intent_id` to identify card payments. Cash orders have `payment_method` values like 'cash', 'interac', 'credit_at_door', etc.

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

## Accounting & Reporting System

### Overview
Full accounting system for Linda's weekly payment workflow: restaurant statements with adjustments, commission reports with carry-over balances, batch processing with ownership grouping, vendor commission tracking, and automated invoicing.

### Database Tables (Custom - use `(supabase as any)` for queries)
- `statement_adjustments` - Credits/charges for restaurant statements (refunds, domain renewals, etc.)
- `commission_weekly_snapshots` - Weekly carry-over data for rolling commission balances
- `vendor_configs` - Vendor partner configuration (name, company, tax rate, payment terms)
- `vendor_restaurant_assignments` - Maps vendors to restaurants with commission rates and version (v1/v2)
- `vendor_invoices` - Auto-numbered invoices for vendor billing
- `restaurant_ownership_groups` - Groups restaurants by owner for batch reporting
- `restaurant_group_memberships` - Restaurant-to-group assignments

### HST Calculation Rule
HST (13%) applies ONLY to service fees (commission, weekly commission, transaction fees, bank fees, delivery commission) and non-tax-exempt adjustments. Does NOT apply to tax-exempt adjustments like refunds.

### Carry-over Commission Logic
This Week + Prev Week + Carry Value - Net Paid = Next Week Balance. Snapshots saved to `commission_weekly_snapshots` for rolling forward week-to-week.

### Vendor Invoice Numbers
Auto-increment per vendor (max invoice_number + 1 for vendor_id). Menu's HST: "82804 8280 RT0001", Company: "Local Media Concepts Inc."

### Linda's Workflow
1. Weekly Mon-Sun statements → 2. Batch CSV export → 3. Commission report with carry-over → 4. Vendor monthly reports → 5. Vendor invoices

### Key Admin Pages
- `/admin/reporting/statements` - Individual restaurant statements with adjustments
- `/admin/reporting/batch-statements` - Batch processing with ownership grouping and CSV export
- `/admin/reporting/commission` - Weekly commission with carry-over balances and snapshot
- `/admin/reporting/adjustments` - CRUD for statement credits/charges
- `/admin/reporting/vendor-commissions` - Monthly vendor commission reports with assignment management
- `/admin/reporting/vendor-invoices` - Vendor invoice CRUD with print-ready view

### Key API Endpoints
- `/api/reports/statement` - Single restaurant statement
- `/api/reports/batch-statements` - All restaurants batch
- `/api/reports/commission-report` - GET for report, POST for snapshot
- `/api/reports/adjustments` - CRUD for adjustments
- `/api/reports/vendor-commissions` - Vendor commission calculation
- `/api/reports/vendor-configs` - Vendor configuration
- `/api/reports/vendor-assignments` - Vendor-restaurant mappings
- `/api/reports/vendor-invoices` - Invoice CRUD
- `/api/reports/ownership-groups` - Restaurant ownership groups

### Database Migration
SQL file at `db/migrations/create_reporting_tables.sql` - run manually in Supabase SQL Editor.

## Twilio Order Fallback System

### Purpose
Protects restaurants from missed orders when tablets aren't acknowledged. If an order isn't acknowledged within 3 minutes, the system automatically calls the restaurant to notify them.

### How It Works
1. **Cron Job** (`scripts/order-fallback-cron.ts`): Runs every 2 minutes via Replit Scheduled Deployment
2. **Cron API** (`app/api/cron/order-fallback/route.ts`): Scans for unacknowledged orders older than 3 minutes
3. **Call Initiation** (`lib/twilio/calls.ts`): Places outbound call to restaurant phone
4. **Voice Webhook** (`app/api/twilio/voice/order-fallback/route.ts`): Twilio calls this to get TwiML response
5. **Order Summary** (`lib/fallback/order-summary.ts`): Builds natural speech text for the call

### Call Flow
- Twilio calls restaurant phone number
- Polly.Joanna voice reads: "Hello, this is Menu.ca calling about order [number] for [restaurant]. The order contains [items]. The total is [amount]. Press 1 to repeat. Press 2 to confirm received."
- DTMF input: Press 1 repeats the message, Press 2 confirms receipt
- Confirmation is logged to `order_status_history` table

### Phone Number Lookup Priority
1. `restaurant_twilio_config.phone` (menuca_v3 schema)
2. `admin_users.phone` (restaurant admin's phone)
3. `restaurant_locations.phone` (menuca_v3 schema)

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

### Key Files
- `app/api/twilio/voice/order-fallback/route.ts` - Voice webhook handler
- `app/api/cron/order-fallback/route.ts` - Cron endpoint
- `lib/twilio/calls.ts` - Twilio REST API wrapper
- `lib/fallback/order-fallback.ts` - Phone lookup and call logging
- `lib/fallback/order-summary.ts` - Speech text builder
- `scripts/order-fallback-cron.ts` - Scheduled deployment script

### Setting Up Replit Scheduled Deployment
1. Go to "Publishing" tool in Replit workspace
2. Select "Scheduled" deployment type
3. Command: `npx ts-node scripts/order-fallback-cron.ts`
4. Schedule: Every 2 minutes (cron: `*/2 * * * *`)
5. Timeout: 60 seconds

### Important Notes
- XML in TwiML responses must escape `&` as `&amp;` in URLs
- Voice uses Amazon Polly.Joanna for natural-sounding speech
- Calls are logged to `order_status_history` with status 'fallback_call_placed' and 'fallback_call_confirmed'